# TruthMed — AI Health Fact Checker & 3D Anatomy Explorer

AI-powered health claim verification and interactive 3D anatomy education.

---

## Quick Start

**Double-click `start.bat`** (Windows) — opens two terminal windows, one for the backend and one for the frontend.

Or with PowerShell:
```powershell
.\start.ps1
```

Then open **http://localhost:5173** in your browser.

---

## About the Database

**No database installation is required.**

TruthMed uses **SQLite**, which is a plain file (`backend/truthmed.db`).  
It is created automatically the first time the backend starts.  
You do not need to install PostgreSQL, MySQL, or any database server.

The database stores:
- Fact-check analysis history (so you can revisit past results)
- Organ content seeded from WHO/NHS/NIH sources (loaded once on startup)

If you delete `backend/truthmed.db`, it is re-created and re-seeded on the next start.

---

## Prerequisites

| Tool | Minimum version | Install |
|---|---|---|
| Python | 3.11+ | python.org |
| Node.js | 18+ | nodejs.org |
| npm | 9+ | included with Node.js |

---

## First-Time Setup

### 1. Configure the API key

Copy the example env file and add your Anthropic API key:

```powershell
Copy-Item .env.example backend\.env
```

Edit `backend\.env`:
```
ANTHROPIC_API_KEY=sk-ant-...your-real-key-here...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Get an API key at: https://console.anthropic.com

> Without a real API key, the fact-checker returns a "not configured" message instead of an analysis. The anatomy explorer works without any API key.

### 2. Install backend dependencies

```powershell
cd backend
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```powershell
cd frontend
npm install
```

---

## Running the App

### Option A — Batch script (easiest)

```
start.bat
```

Opens two windows: one for backend, one for frontend.

### Option B — PowerShell script

```powershell
.\start.ps1
```

### Option C — Manual (two terminals)

**Terminal 1 — Backend:**
```powershell
cd backend
uvicorn main:app --reload --port 8001
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

---

## URLs

| Service | URL |
|---|---|
| App | http://localhost:5173 |
| Backend API | http://localhost:8001 |
| Interactive API docs | http://localhost:8001/docs |
| Health check | http://localhost:8001/api/v1/health |

---

## Running Tests

**Backend tests** (18 tests, uses mocked Claude — no API key needed):
```powershell
cd backend
python -m pytest tests/ -v
```

**Frontend unit tests** (8 tests):
```powershell
cd frontend
npm test
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Homepage with claim input and 3D anatomy preview |
| `/fact-check` | Submit and view health claim analysis |
| `/explore` | Interactive 3D human anatomy explorer |
| `/explore/:organId` | Individual organ detail (e.g. `/explore/heart`) |
| `/learn` | Health education centre |
| `/history` | Previously analyzed claims |
| `/about` | Methodology, verdicts, and limitations |
| `/privacy` | Privacy and data handling |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | Backend health check |
| POST | `/api/v1/fact-check` | Submit a health claim |
| GET | `/api/v1/fact-check/history` | Paginated analysis history |
| GET | `/api/v1/fact-check/{id}` | Get a specific result |
| POST | `/api/v1/feedback` | Submit rating for a result |
| GET | `/api/v1/organs` | List all organs |
| GET | `/api/v1/organs/{id}` | Get organ detail |
| GET | `/api/v1/organs/{id}/sources` | Get organ sources |

---

## Optional: Evidence Retrieval

By default, analysis uses Claude's training knowledge only.

To enable real-time medical source retrieval (Brave Search API):

1. Get a key at https://api.search.brave.com
2. Add to `backend/.env`:
   ```
   BRAVE_SEARCH_API_KEY=your-brave-key-here
   ```

The `/api/v1/health` endpoint shows `"retrieval_configured": true` when enabled.  
Without it, analysis results transparently state that no live search was performed.

---

## Architecture

```
TruthMed/
├── backend/                  Python FastAPI
│   ├── app/
│   │   ├── api/              HTTP route handlers
│   │   ├── core/             Config (env vars, settings)
│   │   ├── db/               SQLAlchemy setup + organ seed data
│   │   ├── models/           SQLAlchemy ORM models
│   │   ├── schemas/          Pydantic request/response schemas
│   │   └── services/         Claude AI pipeline + evidence retrieval
│   ├── tests/                Pytest test suite (18 tests)
│   └── main.py               FastAPI app entry point
│
├── frontend/                 React + TypeScript + Vite
│   └── src/
│       ├── components/
│       │   ├── anatomy/      React Three Fiber 3D viewer
│       │   ├── fact-check/   Claim input + result display
│       │   ├── layout/       Header, footer, app shell
│       │   └── ui/           Design system (Button, Card, Badge…)
│       ├── data/             Organ mesh positions and metadata
│       ├── pages/            Route-level page components
│       ├── lib/              API client + utility functions
│       └── types/            TypeScript interfaces
│
├── start.bat                 Windows quick-start script
├── start.ps1                 PowerShell quick-start script
└── .env.example              Environment variable template
```

---

## Security Notes

- The Anthropic API key is **never sent to the browser** — it lives only in `backend/.env` and is used server-side only.
- CORS is restricted to the frontend origin (`http://localhost:5173`).
- All claims are validated server-side before processing.
- Retrieved web content is wrapped in XML delimiters and Claude is instructed to treat it as raw data (prompt injection defence).
- For public deployment: use HTTPS, set a strong `APP_SECRET_KEY`, restrict CORS to your domain, and deploy behind a reverse proxy.

---

## Known Limitations

- The 3D anatomy model uses simplified procedural geometry (spheres/capsules). It is clearly labelled as educational.  
  Replace `frontend/src/components/anatomy/HumanBodyMesh.tsx` with a licensed segmented glTF model for production use.
- Analysis without `BRAVE_SEARCH_API_KEY` uses Claude's training knowledge only — facts are current as of Claude's training cutoff.
- TruthMed is **not a medical device** and does not provide personal medical advice. Always consult a qualified healthcare professional.
