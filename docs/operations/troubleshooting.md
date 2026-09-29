# Troubleshooting

> 🛠️ Operations · Prev: [Deployment](./deployment.md)

Known failure signatures, causes, and fixes — accumulated from this project's real debugging history.

## AI & parsing

| Signature | Cause | Fix |
| --- | --- | --- |
| `toHex is not a function` / `getOrInsertComputed is not a function` in console; **every PDF fails** | pdfjs-dist 6 needs ES2026 APIs; shims missing in one realm | Both realms must be patched: `src/services/pdfjsCompat.js` (main) + the vite plugin (worker). Don't remove either — see [Services → Parsing](../services/parsing.md) |
| "AI proxy not configured" banner in HR | `VITE_AI_PROXY_URL` unset/placeholder | Set it ([Configuration](./configuration.md)); app keeps working via heuristics |
| Every AI section errors at once | Proxy down / key invalid | Check the worker logs; `410` means model EOL — retry later |
| `0/4 processed, 4 failed` in HR | Extraction threw for all files (often the pdfjs issue above) | Check console for the underlying parser error first |
| One candidate failed, others ranked | That file couldn't be read (scanned/empty/corrupt) | Expected behavior; try the file manually |

## Cloud & CORS

| Signature | Cause | Fix |
| --- | --- | --- |
| `saveHrSession` CORS error in console; sync degrades to local-only | The stale Cloud Functions deployment predates the client's `Authorization`/`PUT` usage — or you're pointed at a legacy deployment | Use the [HR API Worker](../backend/hr-api.md) (`hrBackend.js` hard-codes its URL); legacy path: `firebase deploy --only functions` after confirming `corsHeaders` allows `Authorization` + `PUT/PATCH` and no origin gets `Access-Control-Allow-Origin: "null"` |
| HR sync `401 Unauthorized` | Worker's `FIREBASE_WEB_API_KEY` secret missing, or the ID token is expired | `wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml`; the client refreshes tokens automatically — retry after re-login |
| Session opens on one device, redirect on another | Session only exists in that device's IndexedDB and the cloud mirror wasn't written yet | Expected fallback: HrDashboard redirects to `/sessions` when neither local store nor the worker has the record; run the analysis again on the new device |
| Firestore `permission-denied` | Rules expect `resource.data.uid == auth.uid`; client wrote someone else's doc | Data-shape bug — sessions must carry the owner's uid |
| Google sign-in popup closes instantly | Popup blocked, ad-blocker, blocked third-party cookies, or auth domain not authorized | Allow the popup / disable the blocker for the site; add the hosting domain in Firebase console. `authErrors.js` maps the code-specific hint — look for the `[Privacy]` note (popup-only sign-in means a fully blocked popup fails cleanly) |

## Storage & sessions

| Signature | Cause | Fix |
| --- | --- | --- |
| "Device storage quota is full" toast | IndexedDB full (HR sessions embed resume bytes) | Delete old sessions; the HR page shows usage stats |
| Candidate report says "data not found" after reopen | sessionStorage cache gone + session payload missing candidates | Re-run the analysis; sessions persist candidates in IndexedDB |
| Sessions vanished after role switch | Intentional: `switchRole` wipes workspace data | Documented in [Data & Privacy](../data-and-privacy/privacy-and-deletion.md) |
| Cloud resume file missing after upload says success | Supabase envs set but the `resumes` bucket doesn't exist (or isn't public) | Create the bucket in Supabase — name `resumes`, public — then rebuild (see [Launch-Day Checklist → Supabase](./launch-checklist.md#14-supabase-storage---resume-files-in-the-cloud-optional-but-free)) |

## Build & dev

| Signature | Cause | Fix |
| --- | --- | --- |
| Build fails: `X is not exported by …` | Renamed/removed export still imported somewhere | The build is the module-graph typecheck — follow the file/line in the error |
| Stale dev behavior after dependency changes | Vite dep cache | Restart dev server; clear `node_modules/.vite` if needed |
| Landing blank / no 3D | WebGL unavailable or blocklisted | Landing degrades to content-only; check `checkWebGL()` |
| Animations don't run | `prefers-reduced-motion` or touch device | By design — see [Motion & Loading](../frontend/motion-and-loading.md) |

---

**Related pages:** [Deployment](./deployment.md) · [Backend → HR API Worker](../backend/hr-api.md) · [Verification Workflow](../testing/verification.md) · [AI Pipeline → Reliability](../ai-pipeline/reliability.md)
