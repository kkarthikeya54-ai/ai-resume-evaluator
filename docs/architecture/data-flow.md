# Data Flow

> 🏗️ Architecture · Prev: [System Overview](./system-overview.md) · Next: [Routing & Guards](./routing-and-guards.md)

Where every datum is **created**, where it **lives**, and when it **crosses the network**.

## Lifecycle map

```
                    CREATE               STORE (local)            NETWORK (optional)
Resume file    ── dropzone ──►   memory blob URL            ✗ never uploaded (default path)
Resume text    ── fileParser ──► localStorage                  ── inside AI prompts only
AI results     ── gemini.js ───► localStorage (24 h TTL)      ✗ cached response only
Student profile── Account ─────► Firestore users/{uid}      ── Bearer-authenticated
HR session     ── HrDashboard ─► IndexedDB airesume_sessions  ── best-effort mirror to
                   (incl. resume bytes for previews)              HR API worker (Cloud KV,
                                                                  hr:session:<uid>:<id>)
Candidate cache── HrResults ───► sessionStorage                ✗ tab-scoped only
Role           ── Onboarding ──► localStorage per-uid          ✗
```

## Storage inventory (quick reference)

Full table with writers and rules: [Data & Privacy → Data Inventory](../data-and-privacy/data-inventory.md).

| Store | Contents |
| --- | --- |
| IndexedDB `airesume_sessions` (keyPath `id`) | Sessions: `{id, uid, role, name, createdAt, updatedAt, payload}` — HR payloads embed `fileData[].bytes` so previews survive reloads offline |
| IndexedDB `airesume_hr` (keyPath `uid`) | Legacy single-session store; migrated once by SessionsPage, then cleared |
| `localStorage` | `airesume_role_<uid>`, `airesume_resume_text_<uid>`, `airesume_resume_metadata`, `airesume_cache_v1:<hash>` |
| `sessionStorage` | `airesume_hr_candidates` (instant CandidateView navigation within a tab) |
| Firestore | `users/{uid}` (profile + stats); `hr_sessions/{id}` is a legacy mirror — the active one is the HR API worker's KV |
| Cloud Storage | `resumes/{uid}/…` (only if the cloud storage path is enabled) |

## Flow: a student analysis

```
extractText(file) ──► looksLikeResume? ──► saveResumeText(uid)
      └─ sparse? ──► OCR (tesseract) ─┘        │
                                               ▼
                            dispatchRunAnalyses(resumeText)  [window CustomEvent]
                                               │
              ┌────────────────────────────────┼─────────────────────────────┐
              ▼            ▼            ▼            ▼           ▼            ▼
         summary     readiness    skillGap     roadmap       dsa     interview…
         (each section: cache hit? → render : dedupe → slot → POST proxy → JSON → cache → render)
```

## Flow: an HR pipeline run

```
files + rules + keywords
   → expandKeywords (AI; originals preserved, ≤60)
   → batches of 3 → concurrency 2
       per batch: extractText ×3 (parallel) → truncate 8k → evaluateBatch (1 LLM call)
       per candidate: normalizeEvaluation → aggregateScores → candidate{}
   → onProgress per file → rank by scores.total → summary
   → saveCandidates (sessionStorage) + putSession (IndexedDB, incl. bytes)
   → optional: saveHrSession cloud mirror to the HR API worker (Bearer token)

Multi-device recovery: opening /hr?session=<id> for a session that exists only on another
device fetches the full record from the worker (fetchHrSession), caches it locally, and
proceeds — no re-upload needed.
```

Cancellation: the `{cancelled}` signal is checked between batches and inside workers; cancelled files are reported in `summary.cancelled`.

## Failure & recovery behavior

| Event | Recovery |
| --- | --- |
| `putSession` quota error | Returns `{ok:false, error:"quota"}` → HrDashboard shows a specific "storage full" message with usage stats |
| Cloud sync fails (CORS/offline) | Console warning only — local store stays the source of truth |
| AI cache miss + proxy down | Section-level error box; HR falls back to heuristic evaluation |
| Page reload mid-session | Everything reloaded from IndexedDB (session payload includes file bytes) |
| Role switch | **Intentional wipe** of resume text, sessions, HR store, caches — the two workspaces are incompatible (see [AuthContext](./routing-and-guards.md#authcontext-internals)) |

---

**Related pages:** [System Overview](./system-overview.md) · [Data & Privacy → Data Inventory](../data-and-privacy/data-inventory.md) · [Services → Storage](../services/storage.md) · [AI Pipeline → Reliability](../ai-pipeline/reliability.md)
