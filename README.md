# The Aggressive Recruiter — `charity_ransomware_v1`

> **⚠️ IMPORTANT SAFETY & ETHICS NOTICE — READ FIRST**
>
> Despite the repository name (`charity_ransomware_v1`), **this project is not malware, ransomware, or any form of harmful software.**
>
> The name is intentional dark-comedy branding: the app "aggressively recruits" volunteers for local charities using satirical AI-generated roasts — think comedy-club emcee, not criminal hacker.
>
> **This application:**
> - Does **not** encrypt, delete, or exfiltrate any files
> - Does **not** lock screens, demand payment, or contact command-and-control servers
> - Does **not** persist on the host OS (it is a standard Next.js web app that runs only while the dev server is active)
> - Requests **camera access only** when the user explicitly clicks "Hero Shot" — an opt-in feature to record a 5-second video for personal use
>
> Camera access is solely for the opt-in UGC (user-generated content) video feature and is never stored server-side.
>
> **Safe handling recommendation:** You may run this application in any standard development environment. No isolation sandbox is required. If you prefer extra caution, a disposable VM or container works fine.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Status & Disclaimer](#status--disclaimer)
3. [How It Works (Architecture)](#how-it-works-architecture)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Local Setup & Run](#step-by-step-local-setup--run)
6. [Environment Variables](#environment-variables)
7. [Running Without API Keys (Mock Mode)](#running-without-api-keys-mock-mode)
8. [Available Scripts](#available-scripts)
9. [Repository Structure](#repository-structure)
10. [CI / Testing](#ci--testing)
11. [Troubleshooting / FAQ](#troubleshooting--faq)
12. [Contributing](#contributing)
13. [License & Disclaimer](#license--disclaimer)

---

## Project Overview

**The Aggressive Recruiter** is an AI-powered web application that uses satirical, roast-style humor to encourage people to volunteer at local non-profit organizations.

| Feature | Description |
|---|---|
| **Roastmaster** | Enter your name; Google Gemini AI generates a personalized, comedic call-to-action urging you to volunteer |
| **Find Charities (Scout)** | Searches for local non-profits near a city using the Google Places API; falls back to mock data if no key is configured |
| **Hero Shot (Booth)** | Opt-in 5-second webcam capture so you can record a personal "I volunteered!" video clip, processed in-browser via ffmpeg.wasm |
| **Shout-Out / Recommendation Letter** | Generates a hilariously self-deprecating recommendation letter you can "send" to a friend to recruit them |
| **Coach (Tab-Switch Detection)** | Catches you switching tabs and delivers a fourth-wall-breaking nudge to come back and volunteer |

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| AI | [Google Gemini 1.5 Flash](https://ai.google.dev/) via `@google/generative-ai` |
| Charity Data | Google Places API (Text Search) |
| Video Editing | [ffmpeg.wasm 0.11](https://ffmpegwasm.netlify.app/) (in-browser, no server upload) |
| Package Manager | npm (lock file committed) |

---

## Status & Disclaimer

**Status: Early prototype / proof-of-concept.**

The codebase is functional but not production-hardened:

- Email delivery for "Shout-Out" letters is **not yet implemented** (logged to console only)
- No authentication or rate limiting on API routes
- No persistent storage — all session state is in-memory (Zustand, resets on page reload)
- The `config.yaml` documents a planned multi-agent "swarm" architecture; not all agents are fully wired up

---

## How It Works (Architecture)

```
Browser (React + Next.js)
│
├── src/app/page.tsx          ← Home: name input + Roastmaster
├── src/app/campaign/page.tsx ← Browse charities, generate Shout-Out letter
├── src/app/booth/page.tsx    ← Opt-in Hero Shot video capture (ffmpeg.wasm)
│
├── Next.js API Routes (server-side)
│   ├── /api/shoutout         ← Calls Gemini AI (roasts + recommendation letters)
│   └── /api/charities        ← Calls Google Places API (or returns mock data)
│
├── agents/
│   ├── roastmaster.ts        ← Gemini AI prompt logic
│   ├── coach.ts              ← Static tab-switch messages
│   ├── editor.ts             ← ffmpeg.wasm video processing
│   └── scout.ts              ← Non-profit data fetch helper
│
└── src/lib/state.ts          ← Zustand session store (ironyScore, userName, etc.)
```

The `next.config.js` sets `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers on every route — required by the browser to enable `SharedArrayBuffer`, which ffmpeg.wasm needs for multi-threaded video encoding.

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| **Node.js** | 18.x LTS | 20.x LTS or 22.x also work; check [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x | Bundled with Node.js 18+ |
| **Git** | any recent | For cloning the repo |
| **OS** | macOS, Linux, or Windows (WSL2) | Native Windows PowerShell works but WSL2 is recommended |

Optional (needed only for live AI features):

| Requirement | Where to get it |
|---|---|
| **Gemini API key** | [Google AI Studio](https://aistudio.google.com/app/apikey) — free tier available |
| **Google Places API key** | [Google Cloud Console](https://console.cloud.google.com/) — requires billing enabled |

> **Tip:** Both API keys are completely optional. The app runs in "mock mode" without them (see [Running Without API Keys](#running-without-api-keys-mock-mode)).

---

## Step-by-Step Local Setup & Run

### 1. Clone the repository

```bash
git clone https://github.com/ti84plusprograms/charity_ransomware_v1.git
cd charity_ransomware_v1
```

### 2. Install dependencies

```bash
npm install
```

Expected output ends with something like:
```
added 412 packages, and audited 413 packages in 18s
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor:

```bash
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Both keys are optional.** Leave them as the placeholder strings (or omit the file entirely) to run in mock mode. See [Running Without API Keys](#running-without-api-keys-mock-mode).

### 4. Start the development server

```bash
npm run dev
```

Expected output:

```
▲ Next.js 16.2.1 (Turbopack)
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000

✓ Starting...
✓ Ready in 1234ms
```

### 5. Open the app

Navigate to **[http://localhost:3000](http://localhost:3000)** in your browser.

**Expected behavior on first load:**
- A dark-themed page titled "The Aggressive Recruiter" with a 🎯 emoji
- A text input asking for your name
- Navigation cards for "Find Charities", "Hero Shot", and "Shout-Out"

### 6. Try the features

| Feature | How to try it |
|---|---|
| **Roast Me** | Enter your name in the home page input and click "Roast Me". With a Gemini key, the AI generates a roast. Without one, you get a fallback message. |
| **Find Charities** | Click "Find Charities" → enter a city name → browse the list of non-profits (mock data if no Google Places key) |
| **Shout-Out Letter** | On the campaign page, select a charity and generate a recommendation letter |
| **Hero Shot** | Click "Hero Shot" → grant camera permission when prompted → record a 5-second clip |
| **Coach nudge** | Switch to a different browser tab and switch back — a pop-up message will appear |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | No | Google Gemini API key. Used server-side in `/api/shoutout` route to generate roasts and recommendation letters. Without it, the route returns a hardcoded fallback message. |
| `GOOGLE_PLACES_API_KEY` | No | Google Places Text Search API key. Used server-side in `/api/charities` route to find local non-profits. Without it, the route returns mock charity data for the given city. |
| `NEXT_PUBLIC_APP_URL` | No | Base URL of the app. Used if you need to construct absolute URLs (e.g., `http://localhost:3000` locally, or your deployment URL in production). |

> **Security note:** `GEMINI_API_KEY` and `GOOGLE_PLACES_API_KEY` are server-only variables (no `NEXT_PUBLIC_` prefix). They are never sent to the browser.

---

## Running Without API Keys (Mock Mode)

The application is designed to work without any API keys:

- **No `GEMINI_API_KEY`:** The `/api/shoutout` route catches the missing-key error and returns a hardcoded humorous fallback message. The UI shows this fallback seamlessly.
- **No `GOOGLE_PLACES_API_KEY`:** The `/api/charities` route automatically calls `getMockNonProfits(city)`, which returns four plausible-sounding fictional organizations (e.g., `"{City} Animal Shelter"`, `"{City} Food Bank"`).

**To confirm you are in mock mode:** run the app with no `.env.local` file (or with placeholder values). The "Find Charities" page will show charities named after the city you typed, and the "Roast Me" button will return a canned message.

---

## Available Scripts

All scripts are run via `npm run <script>`:

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start the development server on port 3000 with Turbopack hot-reload |
| `build` | `next build` | Compile and optimize for production |
| `start` | `next start` | Start the production server (requires a prior `build`) |
| `lint` | `eslint` | Run ESLint on all TypeScript/TSX files using the flat config in `eslint.config.mjs` |
| `test` | `jest` | Run the unit test suite (no API keys required — all tests run in mock mode) |

### Production build

```bash
npm run build
npm run start
```

---

## Repository Structure

```
charity_ransomware_v1/
│
├── agents/                        # Server-side AI & utility agent logic
│   ├── roastmaster.ts             # Gemini AI: generates roasts + recommendation letters
│   ├── coach.ts                   # Static message bank for tab-switch nudges
│   ├── editor.ts                  # ffmpeg.wasm wrapper for in-browser video processing
│   └── scout.ts                   # Helper that wraps the /api/charities call
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout (applies globals.css)
│   │   ├── page.tsx               # Home page: name input + Roastmaster
│   │   ├── globals.css            # Global Tailwind CSS imports
│   │   ├── booth/
│   │   │   └── page.tsx           # Hero Shot: opt-in webcam capture + ffmpeg processing
│   │   ├── campaign/
│   │   │   └── page.tsx           # Campaign: browse charities, generate Shout-Out
│   │   └── api/
│   │       ├── charities/
│   │       │   └── route.ts       # GET /api/charities?city=... → Places API or mock
│   │       └── shoutout/
│   │           └── route.ts       # POST /api/shoutout → Gemini roast or letter
│   │
│   ├── components/
│   │   └── CoachWrapper.tsx       # Client component: renders Coach tab-switch toast
│   │
│   ├── hooks/
│   │   └── useEngagement.ts       # Hook: listens to document.visibilitychange
│   │
│   └── lib/
│       ├── state.ts               # Zustand store: ironyScore, userName, selectedCharity, etc.
│       └── media/                 # (reserved) media processing utilities
│
├── public/                        # Static assets served at /
│
├── scripts/
│   └── ci/
│       └── detect_language.sh     # CI helper: detects project language for workflow branching
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions: safe smoke test (lint + build, no payload exec)
│
├── .env.example                   # Template for environment variables — copy to .env.local
├── config.yaml                    # Agent swarm configuration (documents planned architecture)
├── eslint.config.mjs              # ESLint flat config (Next.js rules)
├── next.config.js                 # Next.js config: Turbopack + COOP/COEP security headers
├── package.json                   # npm scripts and dependency manifest
├── postcss.config.mjs             # PostCSS config (Tailwind CSS plugin)
└── tsconfig.json                  # TypeScript compiler options
```

### Key files explained

**`config.yaml`** — Documents the intended agent "swarm" architecture:

```yaml
swarm:
  name: "The Aggressive Recruiter"
  agents:
    - roastmaster   # Gemini AI satirical recruiter
    - editor        # ffmpeg.wasm video editor
    - coach         # Tab-switch detection
    - scout         # Google Places non-profit fetcher
```

**`next.config.js`** — Sets security headers required for ffmpeg.wasm:

```js
// SharedArrayBuffer requires these two headers to be present:
"Cross-Origin-Embedder-Policy": "require-corp"
"Cross-Origin-Opener-Policy": "same-origin"
```

Without these headers the browser blocks `SharedArrayBuffer` and ffmpeg.wasm will not initialize on the Booth page.

**`src/lib/state.ts`** — Central Zustand store. Key fields:

| Field | Type | Description |
|---|---|---|
| `ironyScore` | `number` (0–100) | Increases when user switches tabs or ignores the app; shown as a progress bar |
| `userName` | `string` | Set on the home page; passed to Gemini for personalized roasts |
| `selectedCharity` | `object \| null` | The charity the user has chosen on the campaign page |
| `tabSwitchCount` | `number` | Count of times user switched away (each switch adds 5 to `ironyScore`) |

---

## CI / Testing

### GitHub Actions (`.github/workflows/ci.yml`)

The repository has a CI smoke-test workflow that runs on:
- Every push to `master`
- Every pull request targeting `master`
- Manual trigger via **Actions → CI Smoke Test → Run workflow**

**What it does:**

1. Detects the project language using `scripts/ci/detect_language.sh` (outputs `node` for this repo)
2. Installs dependencies with `npm ci`
3. Runs lint: `npm run lint`
4. Runs type-check (if a `typecheck` script is present)
5. Runs build: `npm run build`

> **Safety note in CI:** The workflow explicitly states that the "payload" is never executed — it only runs static analysis and build steps.

**To trigger the CI manually:**

1. Go to the repository on GitHub
2. Click **Actions** → **CI Smoke Test**
3. Click **Run workflow** → **Run workflow** (on `master` or your branch)
4. Watch the job log for lint/build results

### Local Testing

Run the unit test suite with:

```bash
npm test
```

All tests run in **mock mode** — no API keys are required. The suite covers:

| Area | What is tested |
|---|---|
| `agents/coach` | `getCoachMessage()` and `getTabReturnMessage()` return valid strings |
| `agents/roastmaster` | Functions throw the correct error when `GEMINI_API_KEY` is absent |
| `GET /api/charities` | 400 on missing `city` param; returns 4 mock charities with correct fields in mock mode |
| `POST /api/shoutout` | Fallback messages for `roast`/`letter` types; success response for `send`; 400 for unknown type |
| `lib/state` | Zustand store actions (`setUserName`, `incrementIronyScore`, `incrementTabSwitchCount`, `setSelectedCharity`, `setRecommendationLetter`) behave correctly |

Additionally, you can run these static checks:

```bash
# Lint check
npm run lint

# Production build (catches TypeScript errors + invalid imports)
npm run build
```

---

## Troubleshooting / FAQ

### `Error: Cannot find module 'next'` or similar after `npm install`

**Cause:** Node.js version mismatch or corrupted `node_modules`.

**Fix:**
```bash
node --version          # must be >= 18.x
rm -rf node_modules package-lock.json
npm install
```

---

### The "Roast Me" button returns `"Our roastmaster is temporarily on vacation"`

**Cause:** `GEMINI_API_KEY` is not set or is invalid.

**Fix:** Add a valid key to `.env.local`:
```
GEMINI_API_KEY=AIza...
```
Then restart the dev server (`Ctrl+C` → `npm run dev`). This is expected and safe behavior in mock mode.

---

### The charity list shows `"{City} Animal Shelter"`, `"{City} Food Bank"`, etc.

**Cause:** `GOOGLE_PLACES_API_KEY` is not set. This is mock mode — normal behavior.

**Fix (to use real data):** Add a valid Places API key (Text Search must be enabled) to `.env.local`:
```
GOOGLE_PLACES_API_KEY=AIza...
```

---

### The Hero Shot (Booth) page shows a ffmpeg error or `SharedArrayBuffer is not defined`

**Cause:** The browser is blocking `SharedArrayBuffer` because the COOP/COEP headers are missing.

**Fix:** This should not happen when running `npm run dev` (Next.js serves the headers from `next.config.js`). If you see this error:
1. Make sure you are accessing the app at `http://localhost:3000` (not a proxy URL without the headers)
2. Hard-refresh the browser (`Ctrl+Shift+R`)
3. Try a different browser (Chrome/Edge work best; some Firefox privacy settings block `SharedArrayBuffer`)

---

### `npm run build` fails with `Type error: ...`

**Cause:** TypeScript compilation error, typically from a missing environment variable type or an import issue.

**Fix:** Read the error message; it includes the file and line number. Common causes:
- Importing from an `agents/` file that imports `process.env` without a corresponding type declaration
- Running on Node.js < 18 (missing `fetch` global)

---

### Port 3000 already in use

```bash
# Find what is using port 3000
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000   # Windows

# Or just run on a different port:
npm run dev -- -p 3001
```

---

### Camera permission denied on the Booth page

**Cause:** Browser has blocked camera access for `localhost`.

**Fix:**
- Chrome: Click the lock/camera icon in the address bar → Allow
- Firefox: Click the camera icon → Allow
- Make sure no other application is holding the camera exclusively

---

## Contributing

This project is in early prototype stage. Contributions welcome. Before submitting a pull request:

1. Run `npm run lint` — fix all ESLint errors
2. Run `npm run build` — ensure the build succeeds with no TypeScript errors
3. The CI workflow will run both automatically on your PR

---

## License & Disclaimer

No license file is currently present in this repository. All rights reserved by the repository owner unless stated otherwise.

**Disclaimer:** This software is provided as-is, for educational and satirical purposes. The name `charity_ransomware_v1` is dark-comedy branding; the code contains no destructive, malicious, or harmful functionality. The authors accept no responsibility for misuse.
