# ☁️ Backend

Deliberately tiny: two stateless Cloudflare Workers and (legacy) five HTTP Cloud Functions. Everything heavy happens in the browser.

| Page | Contents |
| --- | --- |
| **[HR API Worker](./hr-api.md)** | The Cloudflare Worker + KV backend for HR cloud sync — **the active backend** |
| **[Cloud Functions](./cloud-functions.md)** | ⚠️ Legacy — the 5 endpoints, shared machinery (CORS, auth, rate limits, cache) |
| **[Worker Proxy](./worker-proxy.md)** | The Cloudflare AI proxy: contract, secret handling, JSON salvage |
| **[Security Rules](./security-rules.md)** | Firestore + Storage rules, the authorization model end-to-end |

> **Which backend serves what?** AI calls → [Worker Proxy](./worker-proxy.md). HR session sync → [HR API Worker](./hr-api.md). Firestore/Storage → direct client access guarded by [Security Rules](./security-rules.md). The Cloud Functions remain deployed as a fallback but are no longer deployable from a fresh Spark-plan project.

**Related sections:** [Services → Profile & Backend Client](../services/profile-and-backend.md) (how the browser calls these) · [Operations → Deployment](../operations/deployment.md) (how to ship them).
