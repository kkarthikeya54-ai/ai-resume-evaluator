# Privacy & Deletion

> 🔐 Data & Privacy · Prev: [Data Inventory](./data-inventory.md)

## What leaves the device — the exact list

1. **Resume text**, truncated to 8,000 chars (HR) or full text (student), inside AI prompts → to the AI proxy → to the LLM. This is the **only** place resume content goes anywhere.
2. **Job rules + keywords** (HR) — same prompt path.
3. **Profile metadata** you explicitly enter (name, phone, links, academic/HR details) → Firestore `users/{uid}`.
4. **Auth tokens** → Firebase.
5. **Resume files** → only if you configured Supabase (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`); they upload to the `resumes` bucket.
6. **Nothing else.** Files, scores, sessions, shortlists, and chat history live locally unless cloud sync is enabled (`functionsEnabled()`). When it is, the HR session mirror goes to the HR API Worker's Workers KV — token-verified, uid-scoped, and with **raw file bytes stripped client-side** (`slimPayloadForCloud` drops `fileData[].bytes` + blob URLs) so the cloud copy carries structured data only (see [Data Inventory](./data-inventory.md)).

This list *is* the disclosure that the Privacy Policy page describes; keep the two in sync when the AI path changes.

## Secrets posture

| Secret | Lives in | Never appears in |
| --- | --- | --- |
| LLM API keys (`GEMINI_API_KEY`, `NVIDIA_API_KEY`) | Cloudflare Worker secrets (`wrangler secret put`) | Client bundle, repo files, `.env` |
| `FIREBASE_WEB_API_KEY` | HR API Worker secret | Client bundle (the client talks to the worker, not to this key) |
| Firebase web config | `.env` (public by design) | — (web keys are identifier keys; real protection is the security rules) |
| Supabase URL + anon key | `.env` (publishable by design) | — (bucket access policy is the real protection) |
| Function authorization | Firebase ID tokens, verified per request | — |

## Deletion paths

| Action | What it wipes | Code path |
| --- | --- | --- |
| Role switch (Account) | Supabase `resumes/{uid}/` folder (if cloud), resume text + metadata, all sessions, HR store, candidate cache, AI cache, worker-KV mirror | `AuthContext.switchRole` → `dataWipe.wipeUserData` (incl. `POST /account/delete`) |
| Delete resume (AppPage) | Resume file (Supabase or local) + metadata + AI cache | `removeResume` + `clearGeminiCache` |
| Delete session (SessionsPage) | One IndexedDB session | `sessionStore.deleteSession` |
| Clear results (HrDashboard) | Current session payload + candidate cache | `putSession(payload:{})` + `clearCandidates` |
| Delete account | Cloud KV sessions (via the HR API Worker) + all local stores, then sign-out | `hrBackend.deleteUserAccount` → `POST /account/delete` on the worker, then `dataWipe.wipeUserData` + `logout`. *(Legacy Cloud Functions also deleted the Firestore doc + Auth record via the Admin SDK; the worker cannot, so the Auth record currently survives account deletion — known gap.)* |

All local wipes are `Promise.allSettled` — one failing store never blocks the rest.

## Privacy-relevant UX features

- Email-verification banner + gate before AI runs (with a "continue anyway" escape).
- "Files are processed for analysis on this device" messaging in the HR workspace.
- Cookie-consent banner (hidden on legal pages) linking the four policy documents.
- `noindex` on all private pages; legal pages public and linked from signup consent.

## Hardening opportunities (documented, intentionally not changed)

- A **local-only mode** that disables AI entirely would make the privacy story absolute (a deploy-your-own proxy path already exists).
- `navigator.storage.persist()` would stop quota eviction from silently dropping local sessions.
- Pin `ALLOWED_ORIGINS` in production config (dev default is `*`) — both the legacy function env and the worker's `wrangler.hr-api.toml` var.

---

**Related pages:** [Data Inventory](./data-inventory.md) · [Backend → Security Rules](../backend/security-rules.md) · [Getting Started → Product Overview](../getting-started/product-overview.md)
