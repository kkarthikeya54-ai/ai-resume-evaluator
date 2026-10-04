# Storage

> ⚙️ Services · Prev: [HR Pipeline & Copilot](./hr-pipeline.md) · Next: [Profile & Backend Client](./profile-and-backend.md)

The persistence layer spans IndexedDB (`sessionStore`, `hrStore`, `extractCache`), localStorage, sessionStorage, and an optional Supabase bucket — all behind a small facade. Big picture: [Architecture → Data Flow](../architecture/data-flow.md) · Privacy table: [Data & Privacy → Data Inventory](../data-and-privacy/data-inventory.md).

## `sessionStore.js` — IndexedDB `airesume_sessions` (v1)

One object store keyed by session `id`. Records: `{id, uid, role, name, createdAt, updatedAt, payload}` plus optional HR metadata — `interviewDate?` (ISO `YYYY-MM-DD`) and `passRate?` (0–100).

| Export | Notes |
| --- | --- |
| `createSession(uid, role, name, extras?)` | Generates `ses_<ts>_<rand>` id, stamps timestamps; `extras` may carry HR `{interviewDate, passRate}` (rate clamped to 0–100) |
| `listSessions(uid, role)` | Filters owner+role, sorted by `updatedAt` desc; surfaces `interviewDate` + `passRate` for the HR cards/calendar |
| `getSession(id)` | `null` on any failure (callers re-verify `record.uid === user.uid`) |
| `putSession(record)` | **Merges over the stored record** (so partial writes from the dashboard can't drop `interviewDate`/`createdAt`; clear a field with an explicit `null`), stamps `updatedAt`; **quota-aware**: returns `{ok:true,…}` or `{ok:false, error:"quota"\|message}` by sniffing the IndexedDB error |
| `updateSessionMeta(id, {name, interviewDate, passRate})` | Metadata-only update — never touches `payload`; pass `""`/`null` to clear a field |
| `renameSession`, `deleteSession`, `deleteSessionsForUser` | Self-explanatory; all best-effort |
| `getStorageInfo()` | `navigator.storage.estimate()` → `{usage, quota}` (drives the HR usage meter) |
| `estimatePayloadBytes(payload)` | JSON size (excluding `bytes`) + file bytes + resume text |
| `formatBytes`, `createSessionId` | Helpers |

HR payloads embed `fileData[].bytes` (ArrayBuffers) so resume previews survive reloads **offline** — the reason sessions can get large (hence the quota plumbing).

Metadata split: the **pass rate** is mirrored inside `payload.passRate`, so it travels with the cloud copy and re-applies on any device; the **interview date** lives at record level only (IndexedDB), i.e. it is per-device.

## `hrStore.js` — legacy store + candidate cache

- IndexedDB `airesume_hr` (keyPath `uid`): the old single-session model, still read by SessionsPage for a one-time migration, then cleared (`loadSession`/`clearSession`).
- **sessionStorage** candidate cache: `saveCandidates`/`loadCandidates`/`clearCandidates` under `airesume_hr_candidates` — makes CandidateView instant within a tab; HrDashboard and CandidateView keep it in sync.

## `extractCache.js` — IndexedDB `airesume_extract` (v2)

Parsed-text cache for the HR pipeline (see [HR Pipeline → extraction](./hr-pipeline.md)): keyed by SHA-256 of the file bytes, 7-day TTL, 800-entry cap. What makes warm HR re-runs ≈ 40× faster (parsing is skipped entirely).

## `localResumeStorage.js` — local student store (localStorage)

- `saveResume(file, uid, onProgress)` — stores the file as an in-memory blob URL + metadata in `airesume_resume_metadata`; smooths a simulated progress curve for UX.
- `saveResumeText(uid, text)` / `getResume(uid)` / `removeResume(uid)` — `airesume_resume_text_<uid>`; removal revokes blob URLs.

## `supabaseResumeStorage.js` — optional cloud path (Supabase)

Same interface as the local store, backed by **Supabase Storage**: the resume **file** uploads to the public `resumes` bucket at `resumes/{uid}/{timestamp}-{name}`; **metadata and parsed text stay in `localStorage`** under the same keys as the local provider (zero-setup behavior preserved). Activated automatically when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set — no code change needed.

## `cloudResumeStorage.js` — ⚠️ dead code (legacy Firebase path)

The **old** Firebase Storage + Firestore implementation (`uploadBytesResumable`, `resumes/{uid}` docs, owner-only rules). **No longer imported anywhere** — the facade switched to Supabase. Keep the file only as a historical reference; deleting it changes nothing.

## `resumeStorage.js` — the facade

Picks the provider at module load: `supabase` when both Supabase env vars are present, else `local`. Every consumer (`UploadPage`, `AppPage`, `dataWipe`) imports from this facade, so enabling cloud storage is purely an env change.

## `dataWipe.js` — the "forget me" path

```js
wipeUserData(uid) → Promise.allSettled([
  removeResume(uid),      // deletes the Supabase resumes/{uid}/ folder when cloud is on
  deleteSessionsForUser(uid),
  clearHrSession(uid), clearCandidates(), clearGeminiCache(),
  purgeHrCloudSessions()  // POST /account/delete on the HR API worker (KV)
])
```

`allSettled` — one failing store never blocks the rest. Called by role switch (AuthContext) and available for account deletion.

## `storageUtils.js`

`formatBytes` — the single shared byte formatter (both storage modules re-export it; tested in `storageUtils.test.js`).

---

**Related pages:** [Data & Privacy → Deletion Paths](../data-and-privacy/privacy-and-deletion.md) · [Profile & Backend Client](./profile-and-backend.md) · [Architecture → Data Flow](../architecture/data-flow.md)
