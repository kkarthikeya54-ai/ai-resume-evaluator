# Quickstart

> 🧭 Getting Started · Prev: [Product Overview](./product-overview.md) · Next: [Glossary](./glossary.md)

## Prerequisites

- **Node.js 20+** (local dev works on 20/22/24)
- **npm** (the repo has a `package-lock.json`)
- A **Firebase project** (free Spark plan is enough for development)
- **Wrangler** only if you deploy the Cloudflare workers (AI proxy + HR API)
- An **AI proxy** for full AI features — the Cloudflare Worker (see [Operations → Deployment](../operations/deployment.md)). Without one the app still runs; AI sections show clear errors and the HR pipeline falls back to heuristics.

## Install & run

```bash
npm install
cp .env.example .env    # then fill in the values (names listed below)
npm run dev             # → http://localhost:5173
```

### Required environment variables (names only)

| Variable | Needed for |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Auth, profiles, cloud sync |
| `VITE_AI_PROXY_URL` | AI features (Worker or Function URL) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional — cloud resume file storage (Supabase, bucket `resumes`); without them resume storage stays local |
| `VITE_FUNCTIONS_BASE_URL` | *(legacy — no longer read; HR cloud sync uses the HR API Worker with a hard-coded URL)* |

Full details incl. server-side secrets: [Operations → Configuration](../operations/configuration.md). Step-by-step setup: [🧰 Tutorials](../tutorials/README.md).

## Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `dev` | `vite` | Dev server + HMR on :5173 |
| `build` | `vite build` | Production bundle → `dist/` |
| `lint` | `oxlint` | Lint everything (gate: 0 errors) |
| `test` | `vitest run` | Unit tests (111) |
| `preview` | `vite preview` | Serve the built `dist/` locally |

## The dev loop used in this project

1. Make the change.
2. `npm test` + `npm run lint` + `npm run build` (the build also validates the module graph and the pdfjs worker patch).
3. Exercise the **real flows** in the running app: guest → demo modal; student → upload → analyze; HR → session → upload PDFs → Process & Rank → candidate view.
4. Check the browser console is clean.

See [Testing → Verification workflow](../testing/verification.md) for the full checklist.

## Where to look first (code orientation)

| I want to understand/change… | Start at |
| --- | --- |
| How the app boots & routes | `src/main.jsx` → `src/App.jsx` → [Architecture → Routing](../architecture/routing-and-guards.md) |
| The AI prompts & calls | `src/services/gemini.js` → [AI Pipeline → Prompt Catalog](../ai-pipeline/prompt-catalog.md) |
| The HR ranking | `src/services/hrScoring.js` → [AI Pipeline → Ranking Math](../ai-pipeline/ranking-math.md) |
| Resume parsing | `src/services/fileParser.js` → [Services → Parsing](../services/parsing.md) |
| Colors/spacing/motion | `src/index.css` → [Frontend → Design System](../frontend/design-system.md) |
| Where data is stored | [Data & Privacy → Data Inventory](../data-and-privacy/data-inventory.md) |
| The whole file tree | [Reference → Project Map](../reference/project-map.md) |

---

**Related pages:** [Product Overview](./product-overview.md) · [Glossary](./glossary.md) · [🧰 Tutorials](../tutorials/README.md) · [Operations](../operations/README.md) · [Testing](../testing/README.md)
