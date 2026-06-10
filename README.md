# SOCMINT Shield v2.0 — Karnataka CID OSINT Intelligence Platform

> Design and develop a Social Media Intelligence (SOCMINT) based system that enables the lawful collection, correlation, and analysis of publicly available social media and OSINT data to identify and link multiple online accounts belonging to the same individual.

---

## Features

| Feature | Details |
|---|---|
| **20-platform sweep** | GitHub, Reddit, HackerNews, Dev.to, GitLab, Tumblr + 14 HTTP checks |
| **Concurrent search** | All platforms queried in parallel via `asyncio.gather` |
| **Risk engine** | 5-factor rule-based scoring (0–100): spread, age, keywords, anonymity, inconsistency |
| **Alias detection** | Cross-platform display-name correlation |
| **Geo timeline** | Location mentions aggregated from all platforms |
| **Activity feed** | Unified chronological post timeline across platforms |
| **News mentions** | NewsAPI integration for web/media footprint |
| **Section 65B PDF** | Court-admissible report with SHA-256, chain of custody, officer certificate |
| **Inter-state sharing** | Mock Delhi Cyber Police relay modal |
| **Demo mode** | "Try Demo (torvalds)" button for instant judge demonstration |

---

## Quick Start

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API will be live at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env
# .env already points to localhost:8000 for local dev
npm run dev
```

App at `http://localhost:3000`

---

## Deployment

### Backend → Railway

1. Push the `backend/` folder to a GitHub repo
2. Connect to Railway → New Project → Deploy from GitHub
3. Railway auto-detects `railway.toml` — no configuration needed
4. Note your Railway URL (e.g. `https://socmint-backend.railway.app`)

### Frontend → Vercel

1. Push the `frontend/` folder to GitHub
2. Connect to Vercel → New Project → Import
3. Set environment variable: `VITE_API_URL = https://your-app.railway.app`
4. Deploy

---

## API Reference

### `POST /api/search`
```json
{ "username": "torvalds" }
```
Returns: unified profile, platform results, risk score, alias map, geo mentions, timeline.

### `POST /api/report`
```json
{ "profile_data": {...}, "officer_name": "SP Sharma", "case_id": "CID/KA/2026/001" }
```
Returns: `{ "pdf_base64": "...", "filename": "SOCMINT_65B_..." }`

### `GET /api/health`
Returns: `{ "status": "ok", "time": "...", "version": "2.0.0" }`

---

## Platform Coverage

**Tier 1 — Official APIs (rich data)**
GitHub · Reddit · HackerNews · Dev.to · GitLab · Tumblr

**Tier 2 — HTTP profile existence checks**
Twitter/X · Instagram · TikTok · LinkedIn · Telegram · Snapchat · Pinterest · SoundCloud · Medium · Quora · Steam · Pastebin · Flickr · YouTube

---

## Section 65B Compliance

The PDF report satisfies Section 65B of the Indian Evidence Act, 1872:
- SHA-256 and MD5 integrity hashes
- ISO 8601 collection timestamp
- 5-step chain of custody table
- Officer certification block with signature line
- Non-tampering declaration referencing the hash
- Court-admissible format per Section 65B(4)

---

## Production Hardening Features (v4.0.0 Update)

### 1. API Token Authentication & Audit Logs
- **Static Bearer Token**: Configured via `SOCMINT_API_KEY` (backend `.env`) and `VITE_API_KEY` (frontend `.env`).
- **Secure Validation**: Uses constant-time comparison via Python's standard library `secrets.compare_digest()` to prevent timing attacks.
- **Bypass for Dev**: Dev mode bypass warning triggers if the key is not set.
- **Audit Logs**: All queries are logged to `query_log.jsonl` (append-only) tracking timestamp, officer token, query term, query type, request IP, and found platform count.

### 2. Trusted RFC 3161 Timestamping
- **Digital Custody Integrity**: Incorporates trusted timestamp tokens (TST) from public TSAs (e.g. FreeTSA, DigiCert, Sectigo) using `rfc3161ng`.
- **Verified Timestamp**: Displays the timestamp authority (TSA) name and the GeneralizedTime verified response under the Section 65B Digital Evidence Data Integrity table.

### 3. Wikidata Identity Resolution
- **Public Figures Registry**: Automates a parallel lookup against Wikidata API for any name searches.
- **Registry Cards**: Renders occupation, country/citizenship, aliases, and known official social handle links directly in the search results UI if found.

### 4. Advanced Risk Engine: Temporal Anomalies
- **Factor 7 Integration**: Added temporal anomaly scoring (up to 15 points max):
  - **Coordinated account creation**: Multiple target profiles created within a 30-day window.
  - **Dormant account reactivation**: Target profiles created >180 days ago showing active posts.
  - **New account activity burst**: Profile created within last 30 days containing 3 or more posts.

### 5. Officer Profile Persistence
- **LocalStorage Storage**: Standardized `OfficerProfile` type with browser-persisted name, badge, and station parameters.
- **Header Settings**: A dedicated Officer Profile settings drawer in the top-bar allows law enforcement personnel to save their credentials once and automatically pre-fill the signature block in all exported Section 65B PDFs.
