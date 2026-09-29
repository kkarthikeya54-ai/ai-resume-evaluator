# Data Inventory

> 🔐 Data & Privacy · Next: [Privacy & Deletion](./privacy-and-deletion.md)

| Data | Stored where | Written by | Leaves the device? |
| --- | --- | --- | --- |
| Auth identity (uid, email, displayName) | Firebase Auth | `services/auth.js` | Yes (Firebase) |
| Per-user role (`student`/`hr`) | `localStorage: airesume_role_<uid>` | `services/role.js` | No |
| Resume **file** (default path) | In-memory blob URL + metadata in `localStorage: airesume_resume_metadata` | `services/localResumeStorage.js` | **No** |
| Resume **file** (optional cloud path) | Supabase Storage `resumes/{uid}/…` (public bucket) | `services/supabaseResumeStorage.js` | Yes (only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are configured) |
| Resume **text** (student) | `localStorage: airesume_resume_text_<uid>` | `saveResumeText` | **No** — except as AI prompt (see [Privacy & Deletion](./privacy-and-deletion.md)) |
| User profile + usage stats | Firestore `users/{uid}` | `services/userProfile.js` | Yes (owner-only rules) |
| HR sessions (rules, keywords, candidates, **resume bytes**) | IndexedDB `airesume_sessions` | `services/sessionStore.js` | **No** (optional best-effort cloud mirror) |
| HR parsed-text cache | IndexedDB `airesume_extract` (SHA-256 keys, 7-day TTL) | `services/extractCache.js` | No |
| HR cloud mirror | Cloudflare Workers KV `hr:session:<uid>:<id>` via the HR API Worker | `services/hrBackend.js` | Yes (ID token verified server-side; every KV key is uid-scoped; file bytes stripped before mirroring) |
| Candidate cache (current tab) | `sessionStorage: airesume_hr_candidates` | `services/hrStore.js` | No |
| AI results cache (24 h) | `localStorage: airesume_cache_v1:<hash>` | `services/gemini.js` | No |
| Legacy HR single-session store | IndexedDB `airesume_hr` | `services/hrStore.js` | No (migrated once, then cleared) |
| Copilot chat history | React state only (in-memory) | `HrChatPanel` | Only as prompt turns |

## Storage shapes worth knowing

- **HR session payloads embed `fileData[].bytes`** (ArrayBuffers) — resume previews work offline after reload. This is why sessions can be large and why quota handling exists.
- **AI cache entries store the exact input string** alongside the result — a hash collision can't serve the wrong answer.
- **Firestore profiles deep-merge over defaults** on read — new fields appear without migration code.

---

**Related pages:** [Privacy & Deletion](./privacy-and-deletion.md) · [Architecture → Data Flow](../architecture/data-flow.md) · [Services → Storage](../services/storage.md) · [Backend → Security Rules](../backend/security-rules.md)
