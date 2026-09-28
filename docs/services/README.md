# ⚙️ Services

The non-UI logic layer (`src/services/`) — framework-agnostic and the most unit-tested part of the codebase.

| Page | Contents |
| --- | --- |
| **[Layer Map](./layer-map.md)** | Dependency graph, module inventory, conventions (error shapes, best-effort patterns) |
| **[Auth & Role](./auth-and-role.md)** | Firebase wrappers, the role model, error localization |
| **[Parsing](./parsing.md)** | fileParser deep dive: magic bytes, per-format extraction, OCR fallback, resume heuristic, pdfjs ES2026 shims |
| **[AI Gateway](./ai-gateway.md)** | gemini.js: cache, dedupe, concurrency, retries, JSON repair, all 16 prompts |
| **[HR Pipeline & Copilot](./hr-pipeline.md)** | hrScoring + hrChat: batching, ranking, CSV, fallbacks, grounded chat |
| **[Storage](./storage.md)** | IndexedDB/localStorage/sessionStorage modules, the storage facade, cloud alternative, data wipe |
| **[Profile & Backend Client](./profile-and-backend.md)** | userProfile (Firestore) + hrBackend (authenticated HR cloud client for the Cloudflare worker) |

**Related sections:** [AI Pipeline](../ai-pipeline/README.md) for behavior-level detail · [Backend](../backend/README.md) for the server side of `hrBackend`.
