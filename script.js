const API_BASE = 'http://localhost:5000';
const sessionId = 'session-' + (localStorage.getItem('jarvis_session_id') || Math.random().toString(36).slice(2));
localStorage.setItem('jarvis_session_id', sessionId);

// DOM Elements
const chatWindow = document.getElementById('chatWindow');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDrawer = document.getElementById('settingsDrawer');
const voiceSelect = document.getElementById('voiceSelect');
const rateSlider = document.getElementById('rateSlider');
const rateVal = document.getElementById('rateVal');
const pitchSlider = document.getElementById('pitchSlider');
const pitchVal = document.getElementById('pitchVal');
const clearChatBtn = document.getElementById('clearChatBtn');
const arcCanvas = document.getElementById('arcCanvas');

// Audio and Speech State
let soundEnabled = true;
let currentReactorState = 'idle'; // 'idle' | 'listening' | 'thinking' | 'speaking'
let audioCtx = null;
let voices = [];
let selectedVoice = null;

// ==========================================
// 1. PROCEDURAL ARC REACTOR CANVAS ENGINE
// ==========================================
const ctx = arcCanvas.getContext('2d');
let angle1 = 0;
let angle2 = 0;
let pulseVal = 0;
let pulseDir = 0.04;

function drawArcReactor() {
  const w = arcCanvas.width;
  const h = arcCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Speed and colors based on state
  let speed = 0.015;
  let primaryColor = '#00f0ff';
  let glowColor = 'rgba(0, 240, 255, 0.4)';

  if (currentReactorState === 'listening') {
    speed = 0.04;
    primaryColor = '#00ffaa';
    glowColor = 'rgba(0, 255, 170, 0.7)';
  } else if (currentReactorState === 'thinking') {
    speed = 0.08;
    primaryColor = '#ffb700';
    glowColor = 'rgba(255, 183, 0, 0.7)';
  } else if (currentReactorState === 'speaking') {
    speed = 0.03;
    primaryColor = '#00f0ff';
    glowColor = 'rgba(0, 240, 255, 0.8)';
  }

  angle1 += speed;
  angle2 -= speed * 1.4;

  pulseVal += pulseDir;
  if (pulseVal > 1 || pulseVal < 0) pulseDir = -pulseDir;

  // Outer glowing ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Outer segmented notches
  ctx.translate(cx, cy);
  ctx.rotate(angle1);
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.beginPath();
    ctx.moveTo(46, 0);
    ctx.lineTo(52, 0);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = (i % 4 === 0) ? 3 : 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // Middle counter-rotating ring with triangular segments
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle2);
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    ctx.rotate((Math.PI * 2) / 8);
    ctx.beginPath();
    ctx.arc(0, 0, 36, -0.2, 0.2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();

  // Inner pulsing core
  ctx.save();
  ctx.translate(cx, cy);
  const coreRadius = 14 + (pulseVal * 3);
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRadius);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, primaryColor);
  gradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.restore();

  requestAnimationFrame(drawArcReactor);
}
drawArcReactor();

// ==========================================
// 2. SCI-FI SOUND EFFECTS (WEB AUDIO API)
// ==========================================
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playHUDEffect(type) {
  if (!soundEnabled) return;
  try {
    const actx = getAudioContext();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);

    const now = actx.currentTime;

    if (type === 'activate') {
      // Iron Man HUD double high beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'reply') {
      // Smooth tech chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.2);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'click') {
      // Short click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // Audio might be restricted until user interaction
  }
}

// Sound toggle
soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.innerHTML = soundEnabled 
    ? '<i class="fa-solid fa-volume-high"></i>' 
    : '<i class="fa-solid fa-volume-xmark"></i>';
  soundToggleBtn.title = soundEnabled ? 'Sound Effects: ON' : 'Sound Effects: MUTED';
  playHUDEffect('click');
});

// Settings Drawer toggle
settingsBtn.addEventListener('click', () => {
  settingsDrawer.classList.toggle('open');
  playHUDEffect('click');
});

// Clear Chat
clearChatBtn.addEventListener('click', async () => {
  playHUDEffect('click');
  chatWindow.innerHTML = `
    <div class="message jarvis">
      <div class="message-header">
        <span class="label"><i class="fa-solid fa-shield-halved"></i> J.A.R.V.I.S.</span>
        <span class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="message-content">
        <p>Dialogue buffer purged. Ready for fresh directives, Sir.</p>
      </div>
    </div>
  `;
  try {
    await fetch(`${API_BASE}/api/session/${sessionId}`, { method: 'DELETE' });
  } catch {}
});

// ==========================================
// 3. VOICE SPEECH SYNTHESIS ENGINE (BRITISH JARVIS TONE)
// ==========================================
function populateVoiceList() {
  if (!('speechSynthesis' in window)) return;
  voices = window.speechSynthesis.getVoices();

  voiceSelect.innerHTML = '<option value="">Auto-Detect British / English</option>';

  voices.forEach((voice, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceSelect.appendChild(option);
  });

  // Prioritize authentic British voices (Daniel, Oliver, George, Google UK English Male)
  const britishVoice = voices.find(v => 
    v.lang.includes('en-GB') || 
    v.name.includes('Daniel') || 
    v.name.includes('Oliver') || 
    v.name.includes('George') || 
    v.name.includes('UK English Male')
  );

  if (britishVoice) {
    selectedVoice = britishVoice;
    const idx = voices.indexOf(britishVoice);
    if (idx !== -1) voiceSelect.value = idx;
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = populateVoiceList;
  populateVoiceList();
}

voiceSelect.addEventListener('change', () => {
  const val = voiceSelect.value;
  selectedVoice = val !== '' ? voices[val] : null;
});

rateSlider.addEventListener('input', () => {
  rateVal.textContent = `${rateSlider.value}x`;
});

pitchSlider.addEventListener('input', () => {
  pitchVal.textContent = pitchSlider.value;
});

function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  // Strip URLs and markdown for clean spoken output
  const cleanSpeech = text
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[#*`_~]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanSpeech);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  utterance.rate = parseFloat(rateSlider.value) || 1.0;
  utterance.pitch = parseFloat(pitchSlider.value) || 1.0;

  utterance.onstart = () => {
    currentReactorState = 'speaking';
    setHUDStatus('SPEAKING • TRANSMITTING AUDIO', 'thinking');
  };

  utterance.onend = () => {
    currentReactorState = 'idle';
    setHUDStatus('SYSTEM IDLE • READY FOR INPUT', 'online');
  };

  utterance.onerror = () => {
    currentReactorState = 'idle';
    setHUDStatus('SYSTEM IDLE • READY FOR INPUT', 'online');
  };

  window.speechSynthesis.speak(utterance);
}

// ==========================================
// 4. CHAT MESSAGE RENDERING & RICH CARDS
// ==========================================
function setHUDStatus(text, stateClass = 'online') {
  statusText.textContent = text;
  const indicator = statusBar.querySelector('.status-indicator');
  indicator.className = `status-indicator ${stateClass}`;
}

function addMessage(sender, text, cardData = null) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msg = document.createElement('div');
  msg.className = `message ${sender}`;

  const headerHtml = `
    <div class="message-header">
      <span class="label">
        ${sender === 'user' ? '<i class="fa-solid fa-user"></i> YOU' : '<i class="fa-solid fa-shield-halved"></i> J.A.R.V.I.S.'}
      </span>
      <span class="timestamp">${time}</span>
    </div>
  `;

  let cardHtml = '';

  // Render Rich Interactive HUD Cards
  if (cardData) {
    if (cardData.type === 'weather') {
      cardHtml = `
        <div class="hud-card weather-card">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: #fff;">${cardData.city}</div>
            <div style="font-size: 11px; color: #8bb3cf;">${cardData.condition}</div>
          </div>
          <div class="weather-temp">${cardData.temp}°C</div>
          <div class="weather-details">
            <div><i class="fa-solid fa-droplet text-cyan"></i> ${cardData.humidity}%</div>
            <div><i class="fa-solid fa-wind"></i> ${cardData.windSpeed} km/h</div>
          </div>
        </div>
      `;
    } else if (cardData.type === 'wiki') {
      cardHtml = `
        <div class="hud-card wiki-card">
          ${cardData.thumbnail ? `<img src="${cardData.thumbnail}" alt="${cardData.title}" class="wiki-thumb" />` : ''}
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 13px;">${cardData.title}</div>
            <p style="font-size: 11.5px; color: #b8d4e8; margin-top: 4px;">${cardData.extract}</p>
            <a href="${cardData.url}" target="_blank" rel="noopener noreferrer" class="wiki-btn">
              <span>Read Full Dossier</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          </div>
        </div>
      `;
    } else if (cardData.type === 'diagnostics') {
      cardHtml = `
        <div class="hud-card">
          <div style="font-family: var(--font-hud); font-size: 11px; color: var(--primary-cyan); margin-bottom: 6px;">
            <i class="fa-solid fa-server"></i> HOST TELEMETRY STATUS
          </div>
          <div class="diag-grid">
            <div class="diag-item">
              <div>OS: ${cardData.osPlatform} (${cardData.architecture})</div>
              <div style="color: #79a8c7;">Uptime: ${cardData.uptime}</div>
            </div>
            <div class="diag-item">
              <div>CPU: ${cardData.cpuCores} Cores</div>
              <div style="color: #79a8c7;">${cardData.cpuModel}</div>
            </div>
            <div class="diag-item" style="grid-column: span 2;">
              <div style="display: flex; justify-content: space-between;">
                <span>RAM Usage (${cardData.ramPercent}%)</span>
                <span>${cardData.usedRamGb} / ${cardData.totalRamGb} GB</span>
              </div>
              <div class="diag-bar">
                <div class="diag-fill" style="width: ${cardData.ramPercent}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (cardData.type === 'math') {
      cardHtml = `
        <div class="hud-card" style="display: flex; align-items: center; justify-content: space-between;">
          <div style="font-family: monospace; color: #8bb3cf;">${cardData.expression} =</div>
          <div style="font-family: var(--font-hud); font-size: 20px; color: var(--accent-green); font-weight: 700;">
            ${cardData.result}
          </div>
        </div>
      `;
    }
  }

  // Action buttons on Jarvis messages (Replay Voice, Copy Text)
  const actionsHtml = sender === 'jarvis' ? `
    <div class="message-actions">
      <button class="msg-btn replay-btn" title="Replay voice"><i class="fa-solid fa-volume-high"></i> Replay</button>
      <button class="msg-btn copy-btn" title="Copy text"><i class="fa-solid fa-copy"></i> Copy</button>
    </div>
  ` : '';

  msg.innerHTML = `
    ${headerHtml}
    <div class="message-content">
      <p>${text}</p>
      ${cardHtml}
    </div>
    ${actionsHtml}
  `;

  // Attach button events
  if (sender === 'jarvis') {
    const replayBtn = msg.querySelector('.replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        playHUDEffect('click');
        speakText(text);
      });
    }

    const copyBtn = msg.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        }, 1500);
      });
    }
  }

  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ==========================================
// 5. COMMAND DISPATCHER & API CALL
// ==========================================
async function sendToJarvis(rawText) {
  const text = rawText.trim();
  if (!text) return;

  addMessage('user', text);
  playHUDEffect('activate');

  currentReactorState = 'thinking';
  setHUDStatus('PROCESSING DIRECTIVE...', 'thinking');

  try {
    const res = await fetch(`${API_BASE}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sessionId })
    });

    if (!res.ok) throw new Error('Neural core unreachable');

    const data = await res.json();

    playHUDEffect('reply');
    addMessage('jarvis', data.text, data.card);
    speakText(data.text);

    // If backend instructed to open URL (YouTube, Google, Wiki, etc.)
    if (data.action && data.action.type === 'open_url') {
      setTimeout(() => {
        window.open(data.action.url, '_blank');
      }, 700);
    }
  } catch (err) {
    const errorMsg = "My apologies, Sir. I am currently unable to establish a connection with the backend neural engine on port 5000.";
    addMessage('jarvis', errorMsg);
    speakText(errorMsg);
    setHUDStatus('CORE DISCONNECTED • CHECK PORT 5000', 'thinking');
  }
}

// ==========================================
// 6. INPUT HANDLERS & WEB SPEECH RECOGNITION
// ==========================================
sendBtn.addEventListener('click', () => {
  const val = textInput.value;
  if (!val) return;
  textInput.value = '';
  sendToJarvis(val);
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

// Quick Action Chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const cmd = chip.getAttribute('data-cmd');
    sendToJarvis(cmd);
  });
});

// Speech Recognition (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    currentReactorState = 'listening';
    micBtn.classList.add('active');
    setHUDStatus('AUDIO SENSORS ACTIVE • LISTENING...', 'listening');
    playHUDEffect('activate');
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove('active');
    if (currentReactorState === 'listening') {
      currentReactorState = 'idle';
      setHUDStatus('SYSTEM IDLE • READY FOR INPUT', 'online');
    }
  };

  recognition.onerror = (e) => {
    isListening = false;
    currentReactorState = 'idle';
    micBtn.classList.remove('active');
    setHUDStatus(`SENSOR WARNING: ${e.error.toUpperCase()}`, 'thinking');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (transcript) {
      sendToJarvis(transcript);
    }
  };

  micBtn.addEventListener('click', () => {
    getAudioContext();
    if (isListening) {
      recognition.stop();
    } else {
      window.speechSynthesis.cancel();
      recognition.start();
    }
  });
} else {
  micBtn.disabled = true;
  micBtn.title = 'Speech Recognition requires Chrome, Edge, or a WebKit browser';
}

// Backend Health Verification on Startup
window.addEventListener('load', async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (res.ok) {
      const data = await res.json();
      setHUDStatus(`CORE ONLINE • ${data.assistant} NEURAL ENGINE ACTIVE`, 'online');
      document.getElementById('systemArch').innerHTML = '<i class="fa-solid fa-bolt text-cyan"></i> ONLINE';
    } else {
      setHUDStatus('CORE WARNING • ANOMALY DETECTED', 'thinking');
    }
  } catch {
    setHUDStatus('CORE OFFLINE • RUN "npm start" IN /backend', 'thinking');
  }
});
