# GrievancePulse AI — Implementation Plan
## Bihar Cyber Hackathon 2026 · PS-04

---

## Top-Level Overview

**Goal:** Build "GrievancePulse AI" — a production-ready, full-stack application for AI-driven public grievance intelligence and resolution monitoring across Bihar districts.

**Stack:**
- Frontend: React + Vite + Tailwind CSS (dark mode) + Lucide Icons + Leaflet.js + Recharts
- Backend: Node.js + Express (single language across the stack)
- AI: Gemini 1.5 Flash API with full heuristic fallback
- Storage: In-memory + seed JSON (SQLite upgrade path noted but not required for demo)

**Scope:**
- A monorepo with `client/` (React/Vite) and `server/` (Express) folders
- 15–20 rich Bihar seed grievance records
- Multi-parameter search engine (hashtag, department, location, severity)
- Gemini AI pipeline (OCR text + post text → structured JSON scoring)
- Haversine + string-similarity duplicate clustering
- Dark-mode command dashboard with Leaflet map, Recharts analytics, data grid, and resolution modal
- `.env`-driven API key with graceful fallback path

**Non-goals:**
- Real social-media API scraping (mocked/seeded data is intentional)
- Database migrations or ORM setup (in-memory + JSON seed only)
- Authentication / login system

---

## Architecture Diagram (reference only)

```
[React Client - Vite]
  ├── SearchBar (hashtag, location, dept, status)
  ├── AnalyticsBar (Recharts pie + counters)
  ├── MapPanel (Leaflet cluster markers)
  ├── GrievanceGrid (cards + badges)
  └── ResolutionModal (status lifecycle + AI reasoning)
         │  HTTP (REST)
[Express Server]
  ├── GET /api/grievances?hashtag=&location=&dept=&severity=&status=
  ├── POST /api/analyze  (Gemini pipeline or heuristic fallback)
  ├── PATCH /api/grievances/:id/status
  └── GET /api/clusters
         │
  ├── services/geminiService.js   (Gemini 1.5 Flash + fallback)
  ├── utils/clustering.js         (Haversine + string-similarity)
  ├── data/seed_grievances.json   (15–20 rich records)
  └── routes/grievances.js
```

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffolding & Monorepo Setup

**Status:** [ ] pending

**Intent:**
Create the complete directory skeleton, install all dependencies for both `client/` and `server/`, and wire up Vite + Tailwind + Express so `npm run dev` (concurrently) boots both services without errors.

**Expected Outcomes:**
- `client/` runs on port 5173 with Tailwind dark mode configured
- `server/` runs on port 3001 with a working `GET /api/health` returning `{ status: "ok" }`
- `client/` proxies `/api/*` to `server/` via Vite config (no CORS issues in dev)
- `.env.example` exists at root with `GEMINI_API_KEY=` placeholder
- `package.json` at root has `dev` script using `concurrently`

**Todo List:**
1. Create root `package.json` with `concurrently` dev script
2. Scaffold `client/` with `npm create vite@latest` (React + JS template)
3. Install client deps: `react-leaflet leaflet recharts lucide-react`
4. Install and configure Tailwind CSS in `client/` with `darkMode: 'class'` and the `cyber` color palette
5. Set up Vite proxy in `client/vite.config.js` to forward `/api` → `http://localhost:3001`
6. Scaffold `server/` with `npm init`, install `express cors dotenv`
7. Create `server/index.js` with Express app, CORS, JSON body parser, and `GET /api/health`
8. Create `.env.example` and `.gitignore` at root
9. Create full directory tree: `server/data/`, `server/services/`, `server/utils/`, `server/routes/`, `client/src/components/`, `client/src/services/`, `client/src/hooks/`

**Relevant Context:**
- No existing files — clean scaffold
- Vite proxy key: `server: { proxy: { '/api': 'http://localhost:3001' } }`
- Tailwind must have `content` glob covering `./src/**/*.{js,jsx}`

---

### Sub-Task 2 — Seed Data Engine (`seed_grievances.json`)

**Status:** [ ] pending

**Intent:**
Populate `server/data/seed_grievances.json` with 20 realistic, schema-valid Bihar grievance records covering exam leaks, civic infrastructure, and suspicious/bot posts. This is the demo's insurance policy — the dashboard must never appear empty.

**Expected Outcomes:**
- Exactly 20 records in the JSON array
- 5 records with `#BPSC`, `#BiharExamLeak`, or `#CyberCell` hashtags
- 8+ civic/infrastructure records (`#RCD_Bihar`, `#PatnaFloods`, `#PowerOutage`, etc.)
- 3+ records with `authenticity_risk_score > 75` flagged as suspicious
- All 20 records have distinct `id`, valid `coordinates`, `duplicate_cluster_id`, and every schema field populated
- At least 5 distinct Bihar districts represented (Patna, Gaya, Muzaffarpur, Bhagalpur, Darbhanga)
- Duplicate cluster groups: at least 3 clusters with 2–4 records sharing the same `duplicate_cluster_id`

**Schema per record (exact):**
```json
{
  "id": "GRV-2026-PAT-001",
  "platform": "X (Twitter)",
  "author_handle": "@patna_citizen_99",
  "timestamp": "2026-10-20T10:15:00Z",
  "post_text": "...",
  "image_url": "https://images.unsplash.com/...",
  "image_ocr_text": "...",
  "location_tagged": "Patna",
  "coordinates": { "lat": 25.6093, "lng": 85.1235 },
  "hashtags": ["#PatnaFloods", "#RCD_Bihar"],
  "department": "Road Construction Department (RCD)",
  "category": "Infrastructure Damage",
  "severity_score": 9,
  "authenticity_risk_score": 15,
  "authenticity_flag": "Likely Genuine Grievance",
  "status": "Assigned",
  "duplicate_cluster_id": "PAT_RD_WATERLOG_01",
  "ai_summary": "1-sentence summary"
}
```

**Todo List:**
1. Write all 20 records into `server/data/seed_grievances.json` ensuring schema completeness
2. Verify district distribution: Patna (6), Gaya (3), Muzaffarpur (3), Bhagalpur (3), Darbhanga (3), Nalanda (2)
3. Verify cluster distribution: at least 3 `duplicate_cluster_id` values shared by 2+ records
4. Verify 3 records with `authenticity_risk_score >= 76`
5. Verify 5 records contain BPSC/exam-leak hashtags

**Relevant Context:**
- Unsplash image URLs are stable for demo; use distinct photo IDs per record
- Coordinates must be realistic Bihar GPS values
- `ai_summary` field pre-filled with heuristic summary (Gemini will override on live analysis)

---

### Sub-Task 3 — Backend: Express API + Gemini Service + Clustering

**Status:** [ ] pending

**Intent:**
Build the complete server layer: the multi-parameter filtering route, the Gemini AI analysis pipeline with heuristic fallback, and the duplicate clustering algorithm.

**Expected Outcomes:**
- `GET /api/grievances` accepts query params `hashtag`, `location`, `dept`, `severity`, `status` and returns filtered + seed-padded results (always ≥ 15 records)
- `POST /api/analyze` sends post text + OCR to Gemini and returns structured JSON; falls back to heuristic scoring when the API key is absent or network fails
- `PATCH /api/grievances/:id/status` updates the in-memory status of a record
- `GET /api/clusters` returns all cluster groups with member count and master ticket summary
- `GET /api/stats` returns counts for total, critical, duplicates, genuine vs suspicious

**Service: `server/services/geminiService.js`**
- Uses `@google/generative-ai` npm package
- Model: `gemini-1.5-flash`
- Sends exact prompt from requirement spec
- Parses Gemini's JSON response with a try/catch
- Fallback function: computes scores from keyword heuristics (flood/leak/power keywords → severity; bot-pattern keywords → risk score)
- Exported functions: `analyzePost(post_text, image_ocr_text)` → structured object

**Utility: `server/utils/clustering.js`**
- `haversineDistance(coord1, coord2)` → meters
- `stringSimilarity(a, b)` → 0–1 (Jaccard on word sets)
- `clusterGrievances(records)` → mutates/returns records with `duplicate_cluster_id` assigned; groups records within 500m OR similarity ≥ 0.7 OR sharing ≥ 2 hashtags
- `getMasterTickets(records)` → array of cluster summaries with member IDs and count

**Route: `server/routes/grievances.js`**
- In-memory store initialized from seed JSON on server start
- `fetchGrievances(filters)` hybrid fetcher: apply filters to in-memory store; if result < 10, pad with unfiltered seed records to reach 15
- All 4 filter dimensions applied simultaneously with AND logic

**Todo List:**
1. Install `@google/generative-ai` in `server/`
2. Create `server/services/geminiService.js` with `analyzePost()` and `heuristicFallback()`
3. Create `server/utils/clustering.js` with `haversineDistance`, `stringSimilarity`, `clusterGrievances`, `getMasterTickets`
4. Create `server/routes/grievances.js` with in-memory store, `fetchGrievances()`, and all route handlers
5. Register routes in `server/index.js` under `/api`
6. Test all endpoints with curl/Postman: health, grievances (no filter), grievances (hashtag filter), analyze (with and without API key), clusters, stats

**Relevant Context:**
- `GEMINI_API_KEY` loaded via `dotenv` in `server/index.js`
- Haversine formula: `R=6371000`, result in meters
- String similarity: Jaccard = intersection(words_A, words_B) / union(words_A, words_B)
- Clustering must be idempotent — re-running on the same dataset produces the same clusters

---

### Sub-Task 4 — Frontend: React Dashboard (Search + Analytics + Map + Grid)

**Status:** [ ] pending

**Intent:**
Build the full dark-mode command dashboard in React with four interconnected panels: the top search bar, the analytics bar with Recharts, the Leaflet map with cluster markers, and the data grid with grievance cards.

**Expected Outcomes:**
- Dashboard boots in dark mode showing all 15–20 seed records immediately on load
- Top search bar with 4 inputs (hashtag, location, department dropdown, status dropdown) that trigger live filtering via debounced API calls
- Analytics bar showing: Total OSINT Posts, Duplicates Clustered, Critical Alerts (severity ≥ 8), Genuine vs Suspicious ratio — all as live counters + a Recharts pie chart for category breakdown
- Leaflet map (left panel, ~50% width) showing colored cluster markers per district; clicking a marker highlights those records in the grid
- Data grid (right panel) showing cards with: platform badge, severity tag (color-coded), authenticity score + flag badge, department tag, hashtag chips, district label, and "N reports merged" badge for clustered items
- All state managed via a custom `useGrievances` hook

**Component Structure:**
```
client/src/
  App.jsx                        (dark bg, layout shell)
  components/
    SearchBar.jsx                (4 filter inputs)
    AnalyticsBar.jsx             (counters + Recharts PieChart)
    MapPanel.jsx                 (Leaflet MapContainer + MarkerClusterGroup)
    GrievanceGrid.jsx            (scrollable grid of GrievanceCard)
    GrievanceCard.jsx            (single card with all badges)
    ResolutionModal.jsx          (status update + AI reasoning panel)
  hooks/
    useGrievances.js             (fetch, filter state, debounce)
  services/
    api.js                       (fetch wrappers for all backend endpoints)
```

**Todo List:**
1. Create `client/src/services/api.js` with `getGrievances(filters)`, `analyzePost(data)`, `updateStatus(id, status)`, `getClusters()`, `getStats()`
2. Create `client/src/hooks/useGrievances.js` with filter state, debounced fetch, and derived stats
3. Create `App.jsx` dark layout shell with grid areas for all panels
4. Create `SearchBar.jsx` with controlled inputs for hashtag (text), location (text), department (select), status (select)
5. Create `AnalyticsBar.jsx` with 4 stat counters + Recharts `PieChart` for category distribution
6. Create `MapPanel.jsx` using `react-leaflet` `MapContainer`, `TileLayer`, and `CircleMarker` per grievance; color by severity; tooltip shows cluster count
7. Create `GrievanceCard.jsx` with all visual badges and severity color logic
8. Create `GrievanceGrid.jsx` as scrollable container rendering `GrievanceCard` list
9. Wire `SearchBar` → `useGrievances` → `GrievanceGrid` + `MapPanel` + `AnalyticsBar` so all panels update together on filter change

**Relevant Context:**
- Leaflet requires CSS import: `import 'leaflet/dist/leaflet.css'` in `App.jsx`
- Default Leaflet marker icon is broken in Vite — must manually set icon URLs using `L.Icon.Default.mergeOptions`
- Recharts `PieChart` needs `width`/`height` as numbers or use `ResponsiveContainer`
- Tailwind dark mode: root `<html>` must have `class="dark"`; all components use `dark:` variants

---

### Sub-Task 5 — Resolution Modal & Status Lifecycle

**Status:** [ ] pending

**Intent:**
Build the `ResolutionModal` component that gives officers a full action panel: view Gemini AI reasoning, update status through the lifecycle, and see the full grievance details.

**Expected Outcomes:**
- Clicking any `GrievanceCard` opens the `ResolutionModal` overlay
- Modal displays: full post text, image (if URL present), platform, author, timestamp, all AI scores, Gemini summary, hashtag list, coordinates, cluster members count
- Status lifecycle selector: `Received` → `Under Investigation` → `Resolved` → `Closed` — updates persist via `PATCH /api/grievances/:id/status`
- "Re-analyze with AI" button triggers `POST /api/analyze` and refreshes the scores shown in the modal
- Authenticity risk displayed as a color-coded progress bar (green < 30, amber 30–70, red > 70)
- Modal closes on Escape key or backdrop click

**Todo List:**
1. Create `ResolutionModal.jsx` with full detail layout
2. Wire status dropdown to `PATCH` API call with optimistic UI update
3. Implement "Re-analyze" button that calls `analyzePost()` from `api.js` and updates local card state
4. Add keyboard listener for Escape to close
5. Display cluster members: if `duplicate_cluster_id` is set, show a list of sibling grievance IDs from the same cluster
6. Add severity progress bar and authenticity risk bar with color logic

**Relevant Context:**
- Modal must be a portal (`ReactDOM.createPortal`) or an absolutely-positioned overlay with `z-50`
- Status transitions are one-directional: `Received` → `Under Investigation` → `Resolved` → `Closed`
- The `duplicate_cluster_id` can be used to filter the full grievances list for siblings

---

### Sub-Task 6 — Integration, Polish & Demo Hardening

**Status:** [ ] pending

**Intent:**
Wire everything together end-to-end, add demo-hardening safeguards, and ensure the app is jury-ready: no empty states, no crashes, readable on a 1080p screen, and the analytics always show non-zero counts.

**Expected Outcomes:**
- `npm run dev` at root starts both client and server with zero errors
- All 20 seed records appear on first load with no filter applied
- Recharts pie chart renders with legend and category labels
- Map centers on Bihar (approx `25.09°N, 85.31°E`) with zoom level 7
- Empty search results show a "No results — showing seed data" fallback message (never a blank grid)
- All severity scores ≥ 8 are visually highlighted in red in both the grid and map
- `.env.example` documents `GEMINI_API_KEY`, `PORT`, `CLIENT_URL`
- README.md with setup instructions, feature list, and demo script

**Todo List:**
1. Add Bihar-centered map default view and zoom bounds
2. Add empty-state fallback component in `GrievanceGrid`
3. Verify analytics bar counters are accurate against live filtered data
4. Add `README.md` with: project description, tech stack, setup steps, environment variables, feature highlights
5. Final pass: check all Tailwind classes render correctly in dark mode
6. Verify Gemini fallback returns valid heuristic data structure (matching schema) so the modal never shows `undefined`
7. Add `NODE_ENV=development` guard so verbose error messages show in dev but not in a prod build

**Relevant Context:**
- The jury will evaluate live — demo hardening is as important as features
- `concurrently` script at root: `"dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\""`

---

## Implementation Order Summary

```
Sub-Task 1 → Sub-Task 2 → Sub-Task 3 → Sub-Task 4 → Sub-Task 5 → Sub-Task 6
   Scaffold      Seed         Backend      Frontend     Modal         Polish
```

Each sub-task produces a working, testable increment. The backend (Sub-Tasks 1–3) is fully usable via curl before the frontend is built.
