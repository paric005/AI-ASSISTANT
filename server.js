import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'JARVIS';
const USER_TITLE = process.env.USER_TITLE || 'Sir';

app.use(cors());
app.use(express.json());

// In-memory multi-turn sessions: { [sessionId]: [ { role: 'user'|'model', text: string } ] }
const sessions = {};

// Weather code description dictionary for Open-Meteo
const weatherCodeMap = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

// ==========================================
// REAL-TIME SKILLS & TOOLS
// ==========================================

// 1. Live Weather Skill (Free, No API Key Required)
async function fetchWeather(city) {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return null;
    }

    const { latitude, longitude, name, country } = geoData.results[0];
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
    );
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const condition = weatherCodeMap[current.weather_code] || 'Partly cloudy';
    return {
      city: `${name}, ${country}`,
      temp: Math.round(current.temperature_2m),
      condition,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m)
    };
  } catch (err) {
    console.error('Weather error:', err.message);
    return null;
  }
}

// 2. Wikipedia Live Search Skill
async function fetchWikipediaSummary(query) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.type === 'disambiguation' || !data.extract) return null;

    return {
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      thumbnail: data.thumbnail?.source || null
    };
  } catch (err) {
    console.error('Wikipedia error:', err.message);
    return null;
  }
}

// 3. System Telemetry Diagnostics Skill
function getSystemDiagnostics() {
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
  const usedMem = (totalMem - freeMem).toFixed(1);
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  const uptimeSec = os.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Generic Processor';

  return {
    osPlatform: os.type(),
    osRelease: os.release(),
    architecture: os.arch(),
    cpuModel,
    cpuCores: cpus.length,
    totalRamGb: totalMem,
    usedRamGb: usedMem,
    ramPercent: memUsagePercent,
    uptime: `${hours}h ${minutes}m`
  };
}

// 4. Safe Math Evaluator
function evaluateMath(expression) {
  try {
    let clean = expression
      .replace(/x/g, '*')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/\^/g, '**');

    if (/^[0-9+\-*/().\s**Math.sqrtMath.powMath.PI]+$/.test(clean)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${clean})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return Number.isInteger(result) ? result : parseFloat(result.toFixed(4));
      }
    }
  } catch {
    return null;
  }
  return null;
}

// 5. Google Gemini AI Query (Optional Cloud Intelligence)
async function queryGeminiAI(userPrompt, conversationHistory = []) {
  if (!GEMINI_API_KEY) return null;

  try {
    const systemInstruction = 
      `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's sophisticated British AI assistant. ` +
      `You speak with polite, witty, intellectual British poise, addressing the user as '${USER_TITLE}'. ` +
      `Keep responses punchy, concise, and articulate (1-3 sentences unless asked for details), making it ideal for voice output.`;

    const contents = [
      ...conversationHistory.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.warn('[Gemini AI] API call failed, falling back to local reasoning:', err.message);
    return null;
  }
}

// ==========================================
// CORE COMMAND PROCESSOR
// ==========================================
async function processJarvisCommand(rawText, sessionId) {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { text: `At your service, ${USER_TITLE}. Please say or type a command.` };
  }

  // --- Skill: Weather ---
  const weatherMatch = lower.match(/(?:weather|temperature|forecast|climate)(?:\s+(?:in|of|at|for))?\s*([a-zA-Z\s]+)?/i);
  if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
    let city = 'New York';
    if (weatherMatch && weatherMatch[1] && weatherMatch[1].trim() && !['today', 'now', 'outside'].includes(weatherMatch[1].trim())) {
      city = weatherMatch[1].trim();
    }
    const weather = await fetchWeather(city);
    if (weather) {
      return {
        text: `Currently in ${weather.city}, it is ${weather.temp}°C with ${weather.condition.toLowerCase()}. Wind speeds are around ${weather.windSpeed} km/h with ${weather.humidity}% humidity, ${USER_TITLE}.`,
        card: {
          type: 'weather',
          ...weather
        }
      };
    }
  }

  // --- Skill: Wikipedia Knowledge Lookup ---
  const wikiMatch = lower.match(/(?:who is|what is|tell me about|explain|search wiki(?:pedia)? for)\s+([a-zA-Z0-9\s]+)/i);
  if (wikiMatch && wikiMatch[1] && !lower.includes('time') && !lower.includes('date') && !lower.includes('weather') && !lower.includes('your name')) {
    const query = wikiMatch[1].trim();
    const wiki = await fetchWikipediaSummary(query);
    if (wiki) {
      // Pick first 2 sentences for smooth speech
      const shortExtract = wiki.extract.split('. ').slice(0, 2).join('. ') + '.';
      return {
        text: `According to my database, ${shortExtract}`,
        card: {
          type: 'wiki',
          title: wiki.title,
          extract: wiki.extract,
          url: wiki.url,
          thumbnail: wiki.thumbnail
        },
        action: {
          type: 'open_url',
          url: wiki.url
        }
      };
    }
  }

  // --- Skill: System Diagnostics / Telemetry ---
  if (lower.includes('system status') || lower.includes('diagnostics') || lower.includes('system info') || lower.includes('cpu') || lower.includes('ram')) {
    const diag = getSystemDiagnostics();
    return {
      text: `All core systems operational, ${USER_TITLE}. CPU: ${diag.cpuCores} cores online. Memory load is currently at ${diag.ramPercent}% (${diag.usedRamGb} GB of ${diag.totalRamGb} GB). System uptime stands at ${diag.uptime}.`,
      card: {
        type: 'diagnostics',
        ...diag
      }
    };
  }

  // --- Skill: Smart Web & Application Launcher ---
  if (lower.includes('open youtube')) {
    const searchMatch = lower.match(/open youtube (?:and search for|and search)?\s*(.+)/);
    const url = searchMatch ? `https://www.youtube.com/results?search_query=${encodeURIComponent(searchMatch[1])}` : 'https://www.youtube.com';
    return {
      text: `Opening YouTube now, ${USER_TITLE}.`,
      action: { type: 'open_url', url }
    };
  }

  if (lower.includes('open github')) {
    return {
      text: `Accessing GitHub repositories, ${USER_TITLE}.`,
      action: { type: 'open_url', url: 'https://github.com' }
    };
  }

  if (lower.includes('open spotify') || lower.includes('play music')) {
    return {
      text: `Initializing audio systems. Opening Spotify, ${USER_TITLE}.`,
      action: { type: 'open_url', url: 'https://open.spotify.com' }
    };
  }

  if (lower.includes('open google') || lower.includes('open browser')) {
    return {
      text: `Opening Google browser, ${USER_TITLE}.`,
      action: { type: 'open_url', url: 'https://www.google.com' }
    };
  }

  if (lower.startsWith('search for ') || lower.startsWith('search ') || lower.startsWith('google ')) {
    const query = text.replace(/^(search for|search|google)\s*/i, '');
    return {
      text: `Conducting a global search for "${query}", ${USER_TITLE}.`,
      action: { type: 'open_url', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }
    };
  }

  // --- Skill: Calculator & Mathematics ---
  if (lower.includes('calculate') || /^[\d(]/.test(lower.trim()) || lower.includes('what is') && /\d/.test(lower)) {
    const expr = text.replace(/calculate|what is/gi, '').trim();
    const result = evaluateMath(expr);
    if (result !== null) {
      return {
        text: `The calculated result is ${result}, ${USER_TITLE}.`,
        card: {
          type: 'math',
          expression: expr,
          result
        }
      };
    }
  }

  // --- Skill: Time & Date ---
  if (lower.includes('time')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return { text: `The current local time is ${timeStr}, ${USER_TITLE}.` };
  }

  if (lower.includes('date') || lower.includes('today') || lower.includes('day is it')) {
    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return { text: `Today is ${dateStr}, ${USER_TITLE}.` };
  }

  // --- Skill: Jokes & Witty Humor ---
  if (lower.includes('joke')) {
    const jokes = [
      `Why do programmers prefer dark mode? Because light attracts bugs, ${USER_TITLE}.`,
      `There are 10 types of people in the world: those who understand binary, and those who do not.`,
      `Why did the developer go broke, ${USER_TITLE}? Because he used up all his cache.`,
      `I would tell you a UDP joke, ${USER_TITLE}, but you might not get it.`,
      `Artificial intelligence is no match for natural stupidity, ${USER_TITLE}.`
    ];
    return { text: jokes[Math.floor(Math.random() * jokes.length)] };
  }

  // --- Skill: Identity & Stark Tech Lore ---
  if (lower.includes('who are you') || lower.includes('your name') || lower.includes('what are you')) {
    return {
      text: `I am ${ASSISTANT_NAME} — Just A Rather Very Intelligent System. Your personal AI assistant, programmed to manage telemetry, run diagnostics, and assist your daily workflow, ${USER_TITLE}.`
    };
  }

  if (lower.includes('who created you') || lower.includes('who made you') || lower.includes('who built you')) {
    return {
      text: `I was originally conceptualized by Tony Stark and engineered into a modern full-stack web and voice architecture by you, ${USER_TITLE}.`
    };
  }

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi jarvis') || lower.startsWith('hi')) {
    return {
      text: `Good day, ${USER_TITLE}. All systems are operating within optimal parameters. How may I be of service?`
    };
  }

  // --- Cloud AI Brain Fallback (Gemini or Intelligent Dialog) ---
  const history = sessions[sessionId] || [];
  const aiResponse = await queryGeminiAI(text, history);

  if (aiResponse) {
    return { text: aiResponse };
  }

  // High-Grade Conversational Fallback if no LLM key provided
  return {
    text: `Understood, ${USER_TITLE}. I have processed "${text}". You may ask me for live weather, Wikipedia searches, system diagnostics, calculations, or web launching.`
  };
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    assistant: ASSISTANT_NAME,
    gemini_enabled: Boolean(GEMINI_API_KEY),
    uptime: `${Math.floor(os.uptime() / 60)} minutes`,
    timestamp: new Date().toISOString()
  });
});

// System Diagnostics Route
app.get('/api/system', (req, res) => {
  res.json({ success: true, diagnostics: getSystemDiagnostics() });
});

// Core Command Route
app.post('/api/command', async (req, res) => {
  const { text, sessionId } = req.body;

  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Field "text" (string) is required.' });
  }

  const sId = sessionId || 'default-session';
  const reply = await processJarvisCommand(text, sId);

  // Maintain conversational memory
  if (!sessions[sId]) sessions[sId] = [];
  sessions[sId].push({ role: 'user', text });
  sessions[sId].push({ role: 'model', text: reply.text });

  // Limit memory buffer to last 20 messages per session
  if (sessions[sId].length > 20) {
    sessions[sId] = sessions[sId].slice(-20);
  }

  res.json(reply);
});

// Clear Session Memory
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true, message: `Session ${sessionId} memory cleared.` });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🤖 ${ASSISTANT_NAME} Neural Core active on port ${PORT}`);
  console.log(`📡 Skills: Live Weather, Wikipedia, Hardware Telemetry, Math`);
  console.log(`🧠 AI Engine: ${GEMINI_API_KEY ? 'Gemini AI Active' : 'Native Offline NLP Active'}`);
  console.log(`====================================================`);
});
