# GrievancePulse AI 🛡️
### Bihar Cyber Hackathon 2026 · PS-04: AI-Driven Public Grievance Intelligence and Resolution Monitoring Platform

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-18+-green)
![React](https://img.shields.io/badge/react-18-61dafb)
![Vite](https://img.shields.io/badge/vite-5-purple)
![Tailwind](https://img.shields.io/badge/tailwindcss-3-38bdf8)

---

## Overview

**GrievancePulse AI** is a production-ready, full-stack intelligence platform that monitors, classifies, clusters, and resolves public grievances across Bihar districts using AI-powered OSINT analysis, geospatial visualization, and real-time duplicate detection.

The application features a **light-themed SaaS layout** with a fixed left sidebar, clean white cards, and a dedicated top header bar — designed for officer workstations and hackathon demos alike.

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
| AI Pipeline | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Storage | In-memory store + `seed_grievances.json` fallback |
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
    │   └── grievances.js      ← All API routes + hybrid fetcher
    ├── services/
    │   └── geminiService.js   ← Gemini 1.5 Flash + heuristic fallback
    ├── utils/
    │   └── clustering.js      ← Haversine + Jaccard clustering engine
    └── data/
        └── seed_grievances.json  ← 20 Bihar grievance seed records
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
✅ server/utils/clustering.js
✅ server/data/seed_grievances.json

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

# Open server/.env and paste your Gemini API key (optional)
# GEMINI_API_KEY=AIza...
# PORT=3001
# NODE_ENV=development
```

> **No Gemini key?** The app works fully without one — a deterministic heuristic fallback handles all AI scoring. Zero unhandled exceptions.

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
| `GEMINI_API_KEY` | *(empty)* | ❌ Optional | Google Gemini 1.5 Flash API key. Heuristic fallback active without it. |
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
| `POST` | `/api/analyze` | Run Gemini AI analysis on post text |
| `GET` | `/api/clusters` | Master ticket cluster summaries |
| `GET` | `/api/stats` | Dashboard KPI counters |
| `POST` | `/api/grievances/:id/escalate` | Escalate complaint to District Magistrate |
| `POST` | `/api/grievances/:id/response` | Generate AI official response draft |

---

## Navigation — 5 Sidebar Tabs

| Tab | Icon | Route Key | Description |
|---|---|---|---|
| Executive Dashboard | LayoutDashboard | `dashboard` | KPI cards, Bihar hotspot map, critical alerts, category pie, resolution pipeline |
| OSINT Search | Search | `osint` | 4-param filter bar, table + grid view, quick-filter hashtag chips |
| Duplicate Clusters | Layers | `clusters` | Master tickets with merge-criteria similarity bars and source lineage |
| AI Verification | Sparkles | `ai` | Gemini workbench with risk meters, bot signal analysis, OCR preview |
| Resolution Portal | FileCheck | `resolution` | SLA lifecycle stepper, overdue escalation, AI response generator, CSV export |

---

## Core Features

### 1. Light-Mode SaaS Layout
- **Fixed Left Sidebar** (`w-64 bg-slate-900`) — brand, 5 nav items with lucide icons, active = `bg-blue-600`
- **Top Header Bar** — dynamic page title, global search, live KPI pills (posts / clusters / critical)
- **Main Canvas** — `bg-slate-50`, all cards `bg-white border-slate-200 shadow-sm`
- **Color-coded status badges** — Received (slate), Assigned (blue), Under Investigation (amber), Resolved (emerald), Closed (muted), Escalated (rose)

### 2. Seed & Hybrid Fallback Data Engine
- 20 pre-populated Bihar grievances across 6 districts
- 5 BPSC/exam-leak records, 8+ civic/infrastructure records, 3 bot-flagged suspicious posts
- If live filters return < 10 results, server pads with seed records to always show 15+

### 3. Multi-Parameter OSINT Search
- Simultaneous filtering: hashtag (partial text), district, department, status, severity, authenticity
- Debounced 400 ms live search
- Quick-filter chips: `#BPSC`, `#PatnaFloods`, `#RCD_Bihar`, Critical Only toggle
- Toggle between table view and card grid view

### 4. Gemini AI Intelligence Pipeline
- Model: `gemini-1.5-flash`
- Input: raw post text + image OCR context
- Output: department, category, severity (1–10), authenticity risk (0–100), flag, location, executive summary
- Full heuristic fallback when key absent or API down

### 5. Duplicate Clustering Algorithm
- **Haversine** geo-proximity: records within 500m → same Master Ticket
- **Jaccard** text similarity: score ≥ 0.70 → clustered
- **Hashtag overlap**: 2+ shared hashtags → clustered
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

## Hackathon Demo Script

1. Open **http://localhost:5173** — sidebar loads, all 20 records appear on Dashboard
2. Click **OSINT Search** in sidebar → type `#BPSC` → 5 exam-leak records filter live
3. Click **Duplicate Clusters** → expand a cluster → see similarity bars + source lineage
4. Click **AI Verification** → click "Re-run Gemini AI" on any suspicious post
5. Click **Resolution Portal** → expand any complaint → move status through lifecycle stepper
6. Click any map marker on Dashboard → Resolution Modal opens with full detail
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
