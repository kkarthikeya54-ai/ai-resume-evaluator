# Layer Map

> ⚙️ Services · Next: [Auth & Role](./auth-and-role.md)

## Module inventory

| Module | One-liner | Detailed page |
| --- | --- | --- |
| `auth.js` | Firebase auth wrappers | [Auth & Role](./auth-and-role.md) |
| `role.js` | ROLES + per-uid role persistence | [Auth & Role](./auth-and-role.md) |
| `fileParser.js` | extractText for PDF/DOCX/TXT/RTF/image + validation | [Parsing](./parsing.md) |
| `pdfjsCompat.js` | ES2026 shims for pdfjs 6 | [Parsing](./parsing.md) |
| `ocr.js` + `ocrWorkerPool.js` | tesseract wrapper + sparse check; persistent 1–2 worker pool | [Parsing](./parsing.md) |
| `extractCache.js` | IndexedDB `airesume_extract` (SHA-256 keys, 7-day TTL) | [HR Pipeline & Copilot](./hr-pipeline.md) |
| `localScoring.js` | The zero-token local HR scorer (default engine) | [HR Pipeline & Copilot](./hr-pipeline.md) |
| `gemini.js` | The AI gateway (cache/retry/concurrency/JSON) | [AI Gateway](./ai-gateway.md) |
| `hrScoring.js` | HR pipeline: batches, ranking, CSV, fallback | [HR Pipeline & Copilot](./hr-pipeline.md) |
| `hrChat.js` | Grounded copilot prompts | [HR Pipeline & Copilot](./hr-pipeline.md) |
| `hrBackend.js` | Authenticated HR cloud client (Cloudflare Worker + KV) | [Profile & Backend Client](./profile-and-backend.md) |
| `sessionStore.js` | IndexedDB session CRUD | [Storage](./storage.md) |
| `hrStore.js` | Legacy HR store + candidate cache | [Storage](./storage.md) |
| `localResumeStorage.js` | Default local student resume store | [Storage](./storage.md) |
| `supabaseResumeStorage.js` | Optional cloud resume files (Supabase, `resumes` bucket) | [Storage](./storage.md) |
| `cloudResumeStorage.js` | ⚠️ **Dead code** — legacy Firebase Storage path, no longer imported | [Storage](./storage.md) |
| `resumeStorage.js` | The storage facade (local ↔ Supabase automatically) | [Storage](./storage.md) |
| `userProfile.js` | Firestore profile + stats | [Profile & Backend Client](./profile-and-backend.md) |
| `dataWipe.js` | The "forget me" path | [Storage](./storage.md) |
| `storageUtils.js` | formatBytes | [Storage](./storage.md) |

## Dependency graph (simplified)

```
config/firebase.js ──► auth.js ──► AuthContext
config/ai.js ──► gemini.js ◄── pdfjsCompat (side effect from fileParser)
                    ▲
fileParser.js ──► hrScoring.js ──► HrDashboard
                    │
                hrChat.js ──► HrChatPanel
config/firebase.js ──► firebase/auth · userProfile (Firestore)
config/supabase (supabaseResumeStorage) ──► resumeStorage facade
sessionStore · hrStore · localResumeStorage · supabaseResumeStorage ──► pages
resumeStorage (facade) ──► localResumeStorage \ supabaseResumeStorage ──► dataWipe ──► AuthContext.switchRole
```

Rule of thumb: **services never import components**; pages/components import services; services import each other only downward (config → storage → domain → facade).

## Conventions

- **Best-effort persistence:** every localStorage/IndexedDB write is wrapped in try/catch — quota failures never crash the UI, they surface as status (`{ok:false, error:"quota"}`) or silent no-ops.
- **Graceful unconfigured mode:** `config/firebase.js` exposes `isConfigured`; auth/storage functions either throw a helpful message or no-op with a warning so the app runs without cloud setup.
- **Pure & testable:** the heavy logic (ranking, coverage, CSV, prompts, JSON repair) is exported as pure functions — that's what the 111 tests target (see [Testing](../testing/test-suites.md)).
- **Cancellation shape:** cooperative `{cancelled}` signal objects, not AbortControllers, for the HR pipeline (cheap, serializable across batch loops).
- **Error messages are user-facing:** thrown `Error.message` strings are rendered directly in error boxes — they're written for users, not developers.

---

**Related pages:** [Auth & Role](./auth-and-role.md) · [AI Gateway](./ai-gateway.md) · [Testing → Test Suites](../testing/test-suites.md)
