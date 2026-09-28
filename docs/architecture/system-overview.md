# System Overview

> 🏗️ Architecture · Next: [Data Flow](./data-flow.md)

The visual version of this page lives at the wiki root: [architecture.svg](../architecture.svg).

## The shape of the system

A **local-first React SPA** with two thin cloud dependencies:

```
Browser (React SPA)                          Cloud
┌─────────────────────────────┐
│ Pages (landing/auth/student/│
│ hr/legal) + RoleGuards      │
│        │                    │   POST {prompt}   ┌──────────────────────┐
│ fileParser ─► resumeText ───┼──────────────────►│ AI proxy (Worker or  │──► LLM
│        │                    │◄──────────────────│ Cloud Function)      │      (key is a
│        ▼                    │   {result: JSON}  └──────────────────────┘       server secret)
│ gemini.js (cache·dedupe·    │
│ retry·concurrency)          │
│        │                    │   PUT/PATCH/GET    ┌──────────────────────┐
│ hrScoring / AppPage         │  + Bearer token    │ Firebase Functions   │
│        │                    ├───────────────────►│ (5 endpoints)        │
│        ▼                    │                    └─────────┬────────────┘
│ IndexedDB · localStorage    │                              ▼
│ sessionStorage              │                    Firestore · Storage
└─────────────────────────────┘                    (owner-scoped rules)
```

**Design consequence:** the browser can do its whole job offline except the AI calls. Parsing happens on-device; storage is local; the cloud exists for (a) the AI key boundary and (b) optional mirrors of small structured data.

## Technology layers

| Layer | Technology | Notes |
| --- | --- | --- |
| UI | React 19, React Router 7, Tailwind CSS 4 | Code-split routes, Suspense skeletons |
| 3D / motion | three.js + @react-three/fiber (landing), framer-motion, custom CSS motion layer | `prefers-reduced-motion` respected everywhere |
| Parsing | pdfjs-dist (worker), mammoth, tesseract.js | All client-side |
| State | React context (`AuthContext`) + per-section `useGemini` state + window CustomEvent bus | No Redux/Zustand — deliberately small |
| Persistence | IndexedDB (2 DBs), localStorage, sessionStorage | See [Data Flow](./data-flow.md) |
| Auth | Firebase Auth | Email/password, Google popup, email verification |
| Cloud | Firebase Functions v2 (Node 20), Firestore, Storage, Cloudflare Worker | See [Backend](../backend/README.md) |
| Quality | Vitest (63), oxlint, PWA build | See [Testing](../testing/README.md) |

## The two user flows (condensed)

### Student
```
/upload: drop file → validateFileBytes (magic bytes) → extractText
  → looksLikeResume sanity check → saveResumeText (localStorage)
  → navigate /app with resumeText → dispatchRunAnalyses (CustomEvent)
  → 10 AI sections each: cache? → dedupe → proxy call → JSON → render
```
Details: [AI Pipeline → Student Flow](../ai-pipeline/student-flow.md)

### HR
```
/hr: session (IndexedDB) → rules + keywords → expandKeywords (AI)
  → multi-file upload → runHrAnalysis: batches of 3, concurrency 2
  → extract → evaluateBatch (1 LLM call per batch) → normalize → rank
  → HrTable (virtualized) → CandidateView / CompareModal / Copilot
```
Details: [AI Pipeline → Ranking Math](../ai-pipeline/ranking-math.md)

## Key architectural decisions (and why)

| Decision | Rationale |
| --- | --- |
| Parse in the browser | Privacy + zero server cost; OCR fallback included |
| AI key server-side only | The client bundle is public by definition |
| Cache AI results 24 h in localStorage | Same resume → same answers for a day; huge cost saving |
| Weighted transparent ranking | Recruiters see every dimension that produced a score |
| Fallback heuristic evaluator | The product still "works" when the AI is down |
| No global state library | Auth is the only true global; sections own their state |
| CustomEvent bus for "Run All" | Decouples the dashboard from its 10 AI sections |

---

**Related pages:** [Data Flow](./data-flow.md) · [Routing & Guards](./routing-and-guards.md) · [Backend](../backend/README.md) · [Reference → Tech Stack](../reference/tech-stack.md)
