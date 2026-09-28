# 🧠 AI Pipeline

How the app thinks: prompts, reliability machinery, both pipelines' behavior, and the ranking math.

| Page | Contents |
| --- | --- |
| **[Prompt Catalog](./prompt-catalog.md)** | All 16 prompt templates: intent, schema, and design conventions |
| **[Reliability](./reliability.md)** | The request lifecycle: cache → dedupe → slots → retries → JSON repair; failure modes table |
| **[Student Flow](./student-flow.md)** | The 10-section dashboard: event bus, per-section behavior, anti-cost measures |
| **[Ranking Math](./ranking-math.md)** | The HR pipeline end-to-end: batching, the weighted score, the fallback evaluator |
| **[Copilot](./copilot.md)** | The grounded recruiter chat: context selection, grounding contract, off-topic guard |

**Underlying services:** [Services → AI Gateway](../services/ai-gateway.md) and [→ HR Pipeline](../services/hr-pipeline.md) document the code APIs; these pages document the behavior.

**Related sections:** [Backend → Worker Proxy](../backend/worker-proxy.md) (the other end of every request) · [Frontend → Motion & Loading](../frontend/motion-and-loading.md) (what users see while this runs).
