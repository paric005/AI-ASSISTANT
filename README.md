# J.A.R.V.I.S. | Neural AI & Voice Assistant

An upgraded, full-stack **Iron Man J.A.R.V.I.S. AI Voice Assistant & Chatbot** built with a real-time reactive **Canvas Arc Reactor HUD**, **Web Speech Recognition**, **British Voice Synthesis**, and a high-performance **Node.js / Express** neural backend featuring live real-world skills and optional **Google Gemini AI** reasoning.

---

## ⚡ What Changed & Upgraded

### 1. Frontend
- **Procedural Canvas Arc Reactor Core**: Replaced external static/missing `orb.gif` with a dynamic multi-ring rotating Arc Reactor that visibly reacts to **IDLE**, **LISTENING**, **THINKING**, and **SPEAKING** states.
- **Web Audio Sci-Fi Synthesizer**: Authentic Iron Man HUD audio effects (activation double-beep, response chime, click feedback) synthesized directly in-browser using Web Audio API oscillators (no external mp3 files required).
- **British Voice Persona (Paul Bettany style)**: Automatically prioritizes UK/British English voices (`en-GB`, `Daniel`, `Oliver`, `George`), with full voice selection, speech speed, and pitch sliders.
- **Rich Interactive HUD Cards**:
  - **Live Weather Card**: Shows temperature in °C, animated condition badge, humidity, and wind speed.
  - **Wikipedia Dossier Card**: Fetches summaries with author/concept thumbnails and direct links.
  - **Host Telemetry Card**: Visual CPU cores, OS platform, and RAM usage gauge.
  - **Math Card**: Step-by-step arithmetic formatting.
- **Quick Directive Chips**: 1-click pills for instant queries (`Weather in Tokyo`, `Nikola Tesla`, `Diagnostics`, `Interstellar OST`, `Tell Joke`).
- **Message Actions**: 1-click **Replay Voice** button and **Copy to Clipboard** button on every dialogue bubble.

### 2. Backend
- **Live Real-World Skills Engine**:
  - **Live Weather**: Connects to the Open-Meteo API for real-time worldwide weather (100% free, zero API key required).
  - **Wikipedia Knowledge Engine**: Queries Wikipedia REST API for encyclopedic summaries.
  - **Hardware Diagnostics**: Real-time Node.js `os` monitoring for CPU cores, RAM load %, and system uptime.
  - **Smart Web Launcher**: Intelligently opens Google, YouTube, GitHub, Spotify, Reddit, and Maps with pre-filled search queries.
  - **Math Evaluator**: Safe algebraic expressions and unit math.
- **Multi-Turn Conversational Memory**: Preserves context across session turns.
- **Optional Gemini AI Supercharge**: Seamlessly connects to Google Gemini (`GEMINI_API_KEY`) for conversational reasoning.

---

## 📁 Project Structure

```text
jarvis-ai-assistant/
├── backend/
│   ├── server.js          # Express server with weather, wiki, telemetry, and AI routing
│   ├── package.json       # Dependencies (express, cors, dotenv)
│   └── .env.example       # Optional GEMINI_API_KEY and customization
│
└── frontend/
    ├── index.html         # HUD layout with Arc Reactor Canvas & settings drawer
    ├── style.css          # Stark Industries holographic theme & card styles
    └── script.js          # Canvas visualizer, Web Audio, SpeechRecognition & TTS
```

---

## 🚀 Running J.A.R.V.I.S.

### 1. Start Backend Server
```powershell
cd backend
npm install
npm start
# Active on http://localhost:5000
```

### 2. Start Frontend
```powershell
cd frontend
npx serve -l 3000
# Active on http://localhost:3000
```

---

## 🔑 (Optional) Add Free Google Gemini AI
To give JARVIS unlimited conversational reasoning on any topic in the universe:
1. Get a free API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create `.env` inside `backend/`:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Restart the backend (`npm start`). JARVIS will automatically switch to the Gemini Neural Core!
