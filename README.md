# CyberHope 🛡️
### Bihar Cyber Hackathon 2026 · PS-04: AI-Driven Public Grievance Intelligence and Resolution Monitoring Platform

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18+-green)
![React](https://img.shields.io/badge/react-18-61dafb)
![Vite](https://img.shields.io/badge/vite-5-purple)
![Tailwind](https://img.shields.io/badge/tailwindcss-3-38bdf8)

---

## Overview

**CyberHope** is a full-stack intelligence platform for monitoring, classifying, clustering, and tracking public grievances across Bihar districts using AI-assisted OSINT analysis, geospatial visualization, and duplicate detection.

The application features a **light-themed SaaS layout** with a fixed left sidebar, clean white cards, and a dedicated top header bar for officer workstations.

---

## What Changed in the Latest UI Refactor

This refactor replaced the original dark-themed top-navbar layout with a modern **Light-Mode SaaS Application shell**:

| Area | Before | After |
|---|---|---|
| **Layout** | Top navbar with tab row | Fixed left sidebar + right content column |
| **Theme** | Dark (`bg-slate-950`) | Light (`bg-slate-50`, white cards) |
| **Navigation** | Horizontal tab bar in header | Vertical sidebar with active highlight |
| **Cards** | `bg-slate-800 border-slate-700` | `bg-white border-slate-200 shadow-sm` |
| **Severity badges** | Dark fills (`bg-red-950`) | Light fills (`bg-rose-100 text-rose-800`) |
| **Form inputs** | `bg-slate-900 text-slate-100` | `bg-slate-50 text-slate-800` |
| **Leaflet map** | Dark hue-rotated tiles | Full-colour OpenStreetMap tiles, white popups |
| **Modal overlay** | `rgba(2,6,23,0.75)` dark blur | `rgba(15,23,42,0.45)` light blur, white modal |
| **New component** | — | `Sidebar.jsx` (brand + nav + footer) |
| **New component** | — | `Header.jsx` (page title + search + KPI pills) |
| **Removed** | `Navbar.jsx` (top tabs) | Replaced entirely by Sidebar + Header |

### New File Structure (frontend)

```
client/src/
├── App.jsx                    ← 2-column shell (Sidebar + main content)
├── components/
│   ├── Sidebar.jsx            ← NEW — Fixed left sidebar w/ brand, nav, footer
│   ├── Header.jsx             ← NEW — Top header bar (title, search, KPI pills)
│   ├── Navbar.jsx             ← LEGACY (kept, no longer imported)
│   ├── GrievanceCard.jsx
│   └── ResolutionModal.jsx    ← Refactored to light mode
├── pages/
│   ├── ExecutiveDashboard.jsx ← Light KPI cards, white popup map, pastel pipeline
│   ├── OSINTSearch.jsx        ← Light filter bar, white table/grid cards
│   ├── ClusteringEngine.jsx   ← Light cluster cards, white similarity bars
│   ├── AIVerification.jsx     ← Light risk meters, tinted signal badges
│   └── ResolutionPortal.jsx   ← Light SLA cards, pastel status badges
├── hooks/
│   └── useGrievances.js
├── services/
│   └── api.js
├── utils/
│   └── dateUtils.js
└── index.css                  ← Full light-mode utility class overrides
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 (**light theme**) |
| UI Components | Lucide React icons + Recharts PieChart |
| Map | Leaflet.js + react-leaflet (OpenStreetMap — light tiles) |
| Backend | Node.js 18 + Express 4 |
| AI Pipeline | Groq text triage, Gemini visual analysis/text failover, deterministic heuristics |
| Storage | SQLite database at `server/data/grievances.sqlite` |
| Dev Tooling | concurrently (run both servers simultaneously) |

---

## Ports

| Service | URL | Notes |
|---|---|---|
| **Frontend (Vite)** | `http://localhost:5173` | React dev server, hot reload |
| **Backend (Express)** | `http://localhost:3001` | REST API server |
| **API Health Check** | `http://localhost:3001/api/health` | Always returns `{ status: "ok" }` |
| **Vite → API Proxy** | `/api/*` → `http://localhost:3001` | Configured in `vite.config.js` — no CORS issues in dev |

> **Production:** Run `npm run build` then serve `client/dist/` from any static host. Point the frontend to your deployed backend URL via `VITE_API_BASE` env var.

---

## Full Project Structure

```
grievancepulse-ai/
│
├── package.json               ← Root monorepo scripts (concurrently)
├── package-lock.json
├── .gitignore                 ← Excludes node_modules, dist, .env files
├── .env.example               ← Root env template
├── README.md
├── grievancepulse-plan.md
│
├── client/                    ← React + Vite frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js         ← port 5173, proxy /api → :3001
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            ← 2-column layout shell
│       ├── index.css          ← Tailwind base + light-mode component classes
│       ├── components/
│       │   ├── Sidebar.jsx    ← Fixed left sidebar (brand + nav + AI/admin footer)
│       │   ├── Header.jsx     ← Page title + global search + KPI pills
│       │   ├── GrievanceCard.jsx
│       │   └── ResolutionModal.jsx
│       ├── pages/
│       │   ├── ExecutiveDashboard.jsx
│       │   ├── OSINTSearch.jsx
│       │   ├── ClusteringEngine.jsx
│       │   ├── AIVerification.jsx
│       │   └── ResolutionPortal.jsx
│       ├── hooks/
│       │   └── useGrievances.js
│       ├── services/
│       │   └── api.js
│       └── utils/
│           └── dateUtils.js
│
└── server/                    ← Express backend
    ├── index.js               ← Entry point, port 3001
    ├── package.json
    ├── env.example
    ├── routes/
    │   ├── grievances.js      ← Grievance and analysis API routes
    │   └── sources.js         ← Public-source status and search routes
    ├── services/
    │   ├── geminiService.js   ← Gemini image analysis, text fallback, heuristic fallback
    │   ├── groqService.js     ← Rate-limited Groq text classification
    │   ├── publicSources.js   ← Google News RSS and Reddit OAuth search
    │   └── storeService.js    ← SQLite-backed grievance persistence
    ├── utils/
    │   └── clustering.js      ← Haversine + Jaccard clustering engine
    └── data/
        └── seed_grievances.json  ← legacy reference data; not loaded by the app
```

---

## Files Included in Repository

The following files are tracked in Git (everything not listed in `.gitignore`):

```
✅ package.json / package-lock.json          (root)
✅ .gitignore
✅ .env.example
✅ README.md
✅ grievancepulse-plan.md

✅ client/index.html
✅ client/package.json / package-lock.json
✅ client/vite.config.js
✅ client/tailwind.config.js
✅ client/postcss.config.js
✅ client/src/**                             (all source files)

✅ server/index.js
✅ server/package.json / package-lock.json
✅ server/env.example
✅ server/routes/grievances.js
✅ server/services/geminiService.js
✅ server/services/storeService.js
✅ server/utils/clustering.js
✅ server/data/seed_grievances.json            (legacy reference data; not loaded at startup)

❌ node_modules/          (excluded — run npm run install:all)
❌ client/node_modules/   (excluded)
❌ server/node_modules/   (excluded)
❌ client/dist/           (excluded — run npm run build)
❌ server/.env            (excluded — copy from env.example)
❌ client/.env            (excluded)
```

---

## Setup & Run

### Prerequisites
- **Node.js 18+** — https://nodejs.org
- **npm 9+** (bundled with Node)
- **Git**

### 1 · Clone the repository

```bash
git clone https://github.com/Amank-rise/GrievancePulse-AI.git
cd GrievancePulse-AI
```

### 2 · Install all dependencies (root + client + server)

```bash
npm run install:all
```

This runs `npm install` in the root, `client/`, and `server/` directories.

### 3 · Configure environment

```bash
# Copy the example env file to server/.env
cp server/env.example server/.env

# Open server/.env and paste your Groq and Gemini API keys (optional)
# GROQ_API_KEY=gsk_...
# GEMINI_API_KEY=AIza...
# PORT=3001
# NODE_ENV=development
```

> Keep provider keys in `server/.env`; never put them in client code or commit them. Groq is the primary text classifier. Gemini is used for uploaded-image descriptions and as a text fallback when available. Deterministic heuristics keep reports flowing if providers are unavailable.

### 4 · Run both servers simultaneously

```bash
npm run dev
```

| Server | URL |
|---|---|
| Frontend | **http://localhost:5173** |
| Backend | **http://localhost:3001** |
| Health | **http://localhost:3001/api/health** |

### 5 · Production build (optional)

```bash
npm run build
# Output: client/dist/  — deploy to Vercel, Netlify, or any static host
```

---

## Environment Variables

**File: `server/.env`** (copy from `server/env.example`)

| Variable | Default | Required | Description |
|---|---|---|---|
| `GROQ_API_KEY` | *(empty)* | ❌ Optional | Groq key for primary text triage. `Groq_API_KEY` is also recognized for existing `.env` files. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | ❌ Optional | Groq chat model used for text classification. |
| `GEMINI_API_KEY` | *(empty)* | ❌ Optional | Google Gemini key for uploaded-image descriptions and Groq text fallback. |
| `GEMINI_MODEL` | `gemini-3.8-flash` | ❌ Optional | Gemini model used for visual analysis and text fallback. |
| `YOUTUBE_API_KEY` | *(empty)* | Optional | YouTube Data API v3 key for public video search. |
| `REDDIT_CLIENT_ID` | *(empty)* | Optional | Reddit app client ID for public Reddit search. |
| `REDDIT_CLIENT_SECRET` | *(empty)* | Optional | Reddit app client secret; keep it on the server. |
| `REDDIT_USER_AGENT` | *(empty)* | Optional | Descriptive Reddit API user agent with an operator contact. |
| `PORT` | `3001` | ❌ No | Express server port |
| `NODE_ENV` | `development` | ❌ No | Set to `production` for prod builds |

---

## API Endpoints

Base URL: `http://localhost:3001`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/grievances` | Filtered list — query params: `hashtag`, `location`, `department`, `status`, `severity`, `authenticity` |
| `GET` | `/api/grievances/:id` | Single grievance record by ID |
| `PATCH` | `/api/grievances/:id/status` | Update complaint status lifecycle |
| `POST` | `/api/grievances/:id/acknowledgment` | Save an acknowledgment draft locally; does not send it externally |
| `POST` | `/api/analyze` | Run Groq text triage, optional Gemini image description, and provider fallbacks |
| `POST` | `/api/sample-reports` | Analyze and add a clearly labeled sample report |
| `GET` | `/api/sources/status` | Return public-source connection status |
| `GET` | `/api/sources/taxonomy` | Return official sector labels, category/department mappings, and quick-search terms |
| `GET` | `/api/sources/search?source=google-news&q=...` | Search Google News RSS results published in the last 24 hours |
| `GET` | `/api/sources/search?source=reddit&q=...` | Search recent Reddit posts using OAuth |
| `GET` | `/api/sources/search?source=youtube&q=...` | Search recent Bihar videos through YouTube Data API v3 |
| `POST` | `/api/grievances/import` | Analyze a selected public item and add it to grievance records |
| `GET` | `/api/clusters` | Master ticket cluster summaries |
| `GET` | `/api/stats` | Dashboard KPI counters |
| `PATCH` | `/api/grievances/:id/escalate` | Escalate complaint to District Magistrate |
| `POST` | `/api/official-response` | Generate AI official response draft |

The **Add Sample Report** header button adds a clearly labeled sample Kankarbagh transformer report. Text classification uses Groq first (`GROQ_MODEL`, default `openai/gpt-oss-20b`), paced at least two seconds apart and capped locally at 14,400 attempts per UTC day. The previously suggested `llama-3.1-8b-instant` model returned HTTP 404 for this configured Groq account; the new default was selected from the account's available models and tested with a JSON triage request. A failed Groq request falls back to Gemini when available, then to the local heuristic classifier. In **AI Verification**, **Local OCR + Groq** runs Tesseract.js in the browser with English and Hindi language data. The image itself stays in the browser; only the recognized text (up to 2,000 characters) is sent to the backend for text triage. The Tesseract.js library code is installed from npm, while its WebAssembly core and language data download from jsDelivr on first use and are cached by the browser; they are not committed as model binaries to GitHub. This means image processing is local, but first-time OCR setup requires internet access. OCR extracts visible text; it does not describe non-text damage or determine authenticity. The separate **Analyze image with Gemini** action sends uploaded JPEG, PNG, or WebP bytes (up to 4 MB) only to Gemini for a brief visual description; images are not saved or sent to Groq, and arbitrary remote image URLs are not fetched. Image descriptions cannot establish authenticity or manipulation, which remains subject to human review. Gemini requests are serialized, spaced at least six seconds apart, capped at 100 attempts per UTC day, and retry transient rate/service errors once; explicit project quota exhaustion is not retried. The UI disables repeat sample submissions for five seconds and manual feed scans for six seconds; background feed scans run every 45 seconds. Per-day provider usage is persisted in the ignored `server/.provider-quotas.json` file so ordinary app restarts do not reset local caps. In **OSINT Search**, Google News RSS can be searched without a key; it supplies headlines and excerpts, not full article text. YouTube search uses the server-side `YOUTUBE_API_KEY`, enforces at least 60 seconds between API requests, caches identical searches for five minutes, limits queued searches, and caps this installation at 40 searches per UTC day (about 4,000 of the default 10,000 daily search quota units). The background poller searches YouTube once per 60 polling cycles (about every 45 minutes) and uses Google News between searches. Reddit search uses OAuth credentials configured only in `server/.env`. Search results are not automatically saved: select **Analyze & Add** to run triage and add the result to shared grievance views. Automated classifications are constrained to supported departments and categories and are triage estimates only: authenticity remains unverified unless a human explicitly marks it reviewed, severity is not increased by sentiment, and district-centroid coordinates are labeled approximate and excluded from duplicate matching. Verify claims, urgency, and location against primary evidence before action. Generated response text is a draft and must be reviewed; it is not sent automatically. Grievance records and status changes are persisted in SQLite across backend restarts.

The organizer-provided OSINT taxonomy is available from `GET /api/sources/taxonomy` and in the public-source search sector selector. The supplied keyword list contains 19 sector blocks (including Government Schemes and Nal Jal as separate sectors); each is mapped to the app's existing category and department set. Analysis stores the selected sector on reports, and duplicate matching will not merge reports when both have different sectors. Background ingestion rotates one official search phrase per 45-second cycle rather than fanning out the full Boolean list, to limit external-source requests. The UI's example query uses only two terms from a selected sector; source support for Boolean syntax can vary.

To enable Reddit, create an app through Reddit's developer app settings, then put its client ID, client secret, and a descriptive user agent containing a contact address in `server/.env`. Restart the backend after changing the environment file. Keep the client secret private and do not put it in frontend environment variables.

---

## Navigation — 5 Sidebar Tabs

| Tab | Icon | Route Key | Description |
|---|---|---|---|
| Executive Dashboard | LayoutDashboard | `dashboard` | KPI cards, Bihar hotspot map, critical alerts, category pie, resolution pipeline |
| OSINT Search | Search | `osint` | 4-param filter bar, table + grid view, quick-filter hashtag chips |
| Duplicate Clusters | Layers | `clusters` | Master tickets with configured match rules and source lineage |
| AI Verification | Sparkles | `ai` | Gemini workbench with risk meters, bot signal analysis, OCR preview |
| Resolution Portal | FileCheck | `resolution` | SLA lifecycle stepper, overdue escalation, AI response generator, CSV export |

---

## Core Features

### 1. Light-Mode SaaS Layout
- **Fixed Left Sidebar** (`w-64 bg-slate-900`) — brand, 5 nav items with lucide icons, active = `bg-blue-600`
- **Top Header Bar** — dynamic page title, global search, live KPI pills (posts / clusters / critical)
- **Main Canvas** — `bg-slate-50`, all cards `bg-white border-slate-200 shadow-sm`
- **Color-coded status badges** — Received (slate), Assigned (blue), Under Investigation (amber), Resolved (emerald), Closed (muted), Escalated (rose)

### 2. Runtime Data Lifecycle
- Grievances are stored in SQLite at `server/data/grievances.sqlite`; the database is created automatically on first server start.
- The database persists records and lifecycle updates across server restarts. It is local to this backend instance and is ignored by Git.
- Set `GRIEVANCE_DB_PATH` in `server/.env` to store the SQLite database at a different path.
- The legacy `server/data/seed_grievances.json` file is not loaded at startup. Records held only in memory by older backend processes require a one-time import before those processes are stopped.
- Reports enter the store through explicit sample submission, public-source import, or live polling.
- Google News searches request the last 24 hours and discard items without a valid publication date or outside that window.
- Google News results and grievance feeds are ordered newest first.

### 3. Multi-Parameter OSINT Search
- Simultaneous filtering: hashtag (partial text), district, department, status, severity, authenticity
- Debounced 400 ms live search
- Quick-filter chips: `#BPSC`, `#PatnaFloods`, `#RCD_Bihar`, Critical Only toggle
- Toggle between table view and card grid view

### 4. Dual-Provider AI Intelligence Pipeline
- Text model: `GROQ_MODEL` from `server/.env` (defaults to the tested `openai/gpt-oss-20b`); Gemini is the secondary text provider.
- Visual model: `GEMINI_MODEL` from `server/.env` (defaults to `gemini-3.8-flash`); only explicit user-uploaded image bytes are sent.
- Text input: post text + optional OCR context; raw image bytes are never sent to Groq.
- Image upload: JPEG, PNG, or WebP, maximum 4 MB; bytes are used for the request and not persisted.
- Local OCR: Tesseract.js browser worker with English + Hindi; image data stays in the browser and extracted text is sent for triage.
- Output: department, category, severity (1–10), authenticity risk (0–100), flag, location, executive summary
- Provider path: Groq → Gemini text fallback → heuristic; image observations use Gemini or remain unavailable/unverified.
- Provider requests are paced, capped, and counted in the ignored local quota-state file.
- No separate local NLP package/model is installed: the fallback is a deterministic English keyword-rules classifier, not a trained NLP model. Clustering uses local Jaccard token overlap, hashtags, and coordinates; the UI shows which analysis path produced a result.

### 5. Duplicate Clustering Algorithm
- **Haversine** geo-proximity: records within 500m → same Master Ticket
- **Jaccard** text similarity: score ≥ 0.70 → clustered
- **Hashtag overlap**: 2+ shared hashtags → clustered
- New posts must also match department and category; cluster IDs are duplicate-group identifiers, not model-confidence scores
- Similarity bar visualisation (Geo / Text / Hashtag %)

### 6. Resolution Portal + SLA Engine
- Full status lifecycle: `Received → Assigned → Under Investigation → Resolved → Closed`
- SLA timer per status with overdue detection and red pulse badge
- One-click **Escalate to DM** on overdue complaints
- AI-generated official response drafts via Gemini
- CSV export of full SLA audit report

---

## Seed Data Distribution

| District | Records | Key Issues |
|---|---|---|
| Patna | 6 | Waterlogging (×3 cluster), Power outage (×2 cluster), Fake news (×3) |
| Gaya | 2 | NH-83 pothole cluster (×2) |
| Muzaffarpur | 2 | Water contamination cluster (×2) |
| Bhagalpur | 2 | Bridge crack cluster (×2) |
| Darbhanga | 1 | Bagmati embankment breach |
| Nalanda | 2 | BPSC TRE-4 exam leak cluster (×2) |
| Patna (BPSC) | 3 | 70th CCE leak cluster (×3) |

---

## Application Walkthrough

1. Open **http://localhost:5173** — the dashboard loads the initial reference records
2. Use **Add Sample Report** in the header to see the local analysis and clustering flow
3. Open **OSINT Search** and search Google News for a Bihar civic issue
4. Select **Analyze & Add** on a relevant source result — its analysis appears in grievance records and dashboard metrics
5. Configure Reddit OAuth values in `server/.env` to enable Reddit search
3. Click **Duplicate Clusters** → expand the Kankarbagh cluster → see all member reports and the configured match rules
4. Click **Resolution Portal** → filter by department, expand the simulated report, and move it through the lifecycle
5. Return to Dashboard — a fully resolved cluster marker is green
6. Click **AI Verification** → click "Re-run Gemini AI" on any suspicious post
7. Find an overdue complaint → click "Escalate to DM"
8. Click "Export SLA Audit Report" → downloads CSV

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `npm run dev` fails | Run `npm run install:all` first |
| Backend not found | Confirm backend is running on port **3001** — check terminal |
| Gemini AI returns error | App falls back to heuristics automatically — no action needed |
| Map tiles not loading | Check internet connection — tiles load from openstreetmap.org |
| Port 5173 in use | Change `server.port` in `client/vite.config.js` |
| Port 3001 in use | Add `PORT=3002` to `server/.env` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request against `main`

---

*Built for Bihar Cyber Hackathon 2026 · PS-04 · by Amank-rise*
