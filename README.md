# HireTire — AI-Driven Resume Evaluation & Hiring Intelligence

AI-powered resume evaluation and parsing platform that lets job seekers and students get a placement-readiness score, skill-gap analysis, resume improvements, a 30/60/90-day roadmap, DSA recommendations, and interview prep — and lets HR teams screen and rank candidates against job requirements. Upload a resume (PDF, DOCX, TXT, or image), and the system extracts skills, education, and experience and evaluates them with AI (Google Gemini, with a free NVIDIA NIM fallback behind a server-side proxy) — or with the built-in instant local scoring engine that needs no API at all.

## Features

### Student Mode (`/app`)
- **Multi-format Resume Upload** — drag & drop PDF, DOCX, TXT, Markdown, RTF, CSV, or image files (up to 5 MB); PDFs are read with pdfjs and fall back to **OCR** (Tesseract) when the text layer is sparse or missing, and images are OCR'd directly
- **Run All Analyses** — one click runs every analysis module in parallel; results auto-run after your first upload
- **Result Caching** — each analysis is cached for 24h (keyed by resume content), so refreshing or re-running doesn't waste API calls
- **Resume Summary** — concise professional summary extracted from your resume
- **Placement Readiness** — score out of 100 with a detailed breakdown across skills, experience, education, and projects
- **Skill Gap Analysis** — missing skills compared against industry trends, with resources to bridge the gap
- **Resume Improvements** — actionable, prioritized suggestions for each section
- **Career Roadmap** — personalized 30/60/90-day plan with weekly focus areas, actions, and outcomes
- **Interview Prep** — categorized interview questions with expected answers and prep tips
- **DSA Recommendations** — curated data structures & algorithms topics, practice plans, and learning resources
- **Projects & Certifications** — personalized recommendations relevant to your career goals

### HR / Recruiter Mode (`/hr`)
- **Role-based sign-in** — pick **Student** or **HR / Recruiter** at login; the role is stored locally on the device and selects which workspace you land in
- **Bulk upload** — drop many resumes at once (PDF, DOCX, TXT, images; up to 10 MB each)
- **Job Rules** — a natural-language box describing what the AI should evaluate
- **Keywords with auto-expansion** — enter keywords (e.g. `react, html, css`) and the AI expands them into related/similar terms using Gemini NLP
- **Bulk evaluation pipeline** — a built-in local scoring engine ranks up to 500 resumes in seconds with zero tokens and zero API cost (tested with 500 real resumes); opt into AI evaluation per run for smaller batches
- **Instant re-runs** — extracted text is cached on-device (IndexedDB, keyed by file hash), so re-processing or tweaking job criteria skips parsing entirely (~40× faster on repeats)
- **Cloud session sync** — HR sessions mirror to a Cloudflare Worker API (auth-guarded, KV-backed) so results survive device switches
- **Ranked results table** — Excel-style table with rank, S.No, candidate name, resume link, and per-section percentage scores (skills, experience, education, projects, keywords) plus an overall composite
- **Resume Assistant chat** — a ChatGPT-style panel that answers only from the uploaded resumes and the job rules; it refuses off-topic questions
- **Device-only storage** — uploaded files and results are stored on the device (IndexedDB), never in Firestore

### Shared
- **Authentication** — email/password (with password reset & email verification) and Google sign-in via Firebase
- **Cloud Persistence** — student resumes are stored locally by default; when the Supabase vars are set, the resume **file** uploads to a Supabase `resumes` bucket (metadata + parsed text stay in the browser) and the profile persists to Firestore

## Tech Stack

- [React](https://react.dev) 19 + [Vite](https://vite.dev) 8
- [Tailwind CSS](https://tailwindcss.com) v4 (light blue/white design system)
- [React Router](https://reactrouter.com) v7
- [Firebase](https://firebase.google.com) — Auth, Firestore (profiles)
- [Supabase](https://supabase.com) — Storage (optional cloud resume files)
- [Google Gemini](https://ai.google.dev) (`gemini-3.8-flash`) for all AI analysis
- [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) for client-side PDF text extraction
- [mammoth](https://www.npmjs.com/package/mammoth) for DOCX text extraction
- [tesseract.js](https://www.npmjs.com/package/tesseract.js) for OCR fallback (scanned PDFs & images)
- [Cloudflare Workers](https://workers.cloudflare.com) — server-side AI proxy (Gemini primary, NVIDIA NIM fallback) + HR session sync API
- [Vitest](https://vitest.dev) for unit tests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Firebase](https://console.firebase.google.com) project (Authentication, Storage, Firestore, and optionally Cloud Functions enabled)
- A [Google AI Studio](https://aistudio.google.com) API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```bash
# Firebase
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# AI proxy — Cloudflare Worker (Gemini primary, NVIDIA fallback). Keys live server-side.
VITE_AI_PROXY_URL=https://ai-proxy.YOUR_SUBDOMAIN.workers.dev

# Supabase Storage — OPTIONAL cloud resume files (public bucket named `resumes`)
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> If Firebase variables are missing, the app runs in **degraded mode**: auth pages explain the gap, and resume uploads fall back to local browser storage, so you can still try the UI. The AI proxy URL is the only variable AI features need.

### Keeping Your AI Keys Secret (recommended)

`VITE_*` vars are compiled into the client bundle and are visible to anyone. The **model keys never go in the bundle** — they live as secrets in a Cloudflare Worker:

1. Deploy the server-side proxy ([docs](docs/backend/worker-proxy.md)):

```bash
cd worker
wrangler secret put GEMINI_API_KEY     # primary (aistudio.google.com/apikey)
wrangler secret put NVIDIA_API_KEY     # fallback (build.nvidia.com) — optional
wrangler deploy
```

2. Set `VITE_AI_PROXY_URL` to the resulting `*.workers.dev` URL
3. Never add `VITE_GEMINI_API_KEY` or `VITE_AI_STUDIO_*` to `.env` — no such variable is read by the current source

### Firebase Setup

1. Enable **Email/Password** and **Google** providers in Firebase Authentication.
2. Enable **Firestore** for profiles. (Firebase **Storage** is only used by the dead-code `cloudResumeStorage.js` path — the active resume-file cloud is Supabase; both are optional because the app is local-first.)
3. Deploy the security rules (they are already in this repo):

```bash
firebase deploy --only firestore:rules,storage
```

The rules lock all resume data to the owning user (the legacy Firebase Storage path used by no active code, plus Firestore profiles):

```js
// firestore.rules
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

```js
// storage.rules
match /resumes/{userId}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Supabase Setup (optional — cloud resume files)

1. Create a free project at [supabase.com](https://supabase.com).
2. Add a **public** bucket named `resumes` (UI: Storage → New bucket, check *Public*).
3. Copy `Project Settings → API` → Project URL + anon key into `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

See [docs/tutorials/](docs/tutorials/) for the full end-to-end setup walkthroughs.

### Run

```bash
npm run dev       # start dev server
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # run oxlint
npm test          # run unit tests
npm run test:ui   # static UI contrast/hover audit
```

## Project Structure

```
.
├── worker/                # Cloudflare Workers: AI proxy (Gemini/NVIDIA) + HR session API (keeps keys server-side)
├── functions/             # Legacy Gemini proxy Cloud Function (Spark-plan deploys blocked; see docs)
├── public/
├── src/
│   ├── components/        # UI components
│   │   ├── upload/        # Student upload flow (dropzone, progress, success, info card)
│   │   ├── hr/            # HR dashboard (config form, progress, results table, chat)
│   │   ├── FormField.jsx  # Shared form input
│   │   ├── RolePicker.jsx # Student / HR role selector
│   │   ├── RoleGuards.jsx # Role-based route guards
│   │   └── ...            # Analysis modules, layout components
│   ├── config/            # Firebase & AI configuration
│   ├── context/           # AuthContext (Firebase auth state + role)
│   ├── hooks/             # useGemini hook
│   ├── pages/             # Landing, Login, Signup, Upload, App, HR dashboard
│   ├── services/          # auth, gemini, resume storage (cloud/local), file parsing (pdfjs/OCR/DOCX), HR scoring, HR chat, HR store (IndexedDB)
│   └── utils/             # auth error mapping, analysis event coordination
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
├── firebase.json          # Firebase CLI config
└── .github/workflows/ci.yml
```

## How It Works

### Student
1. **Upload** — drop your resume (PDF, DOCX, TXT, or image) at `/upload`; it is validated, uploaded, and parsed (OCR fallback for scanned files)
2. **Analyze** — parsed text is sent to Gemini across 10+ analysis dimensions (in parallel via *Run All*)
3. **Insights** — structured reports show scores, gaps, improvements, and recommendations
4. **Act** — follow your roadmap, practice interview questions, and close skill gaps

### HR / Recruiter
1. **Sign in as HR** — choose the HR role at login to reach `/hr`
2. **Configure** — enter job rules and keywords (auto-expanded into related terms in AI mode)
3. **Upload & process** — drop all resumes, hit *Process & Rank*; the local engine reads, scores, and ranks hundreds of files in seconds on your device — no tokens, no waiting (AI evaluation is opt-in per run)
4. **Rank & chat** — review the ranked, Excel-style results table and ask the Resume Assistant anything about the candidates

## License

This project is for educational purposes.
