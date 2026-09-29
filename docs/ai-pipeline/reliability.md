# Reliability

> 🧠 AI Pipeline · Prev: [Prompt Catalog](./prompt-catalog.md) · Next: [Student Flow](./student-flow.md)

Every AI call passes through the same seven-stage lifecycle, then the app decides what failure means for the user.

## The request lifecycle

```
① cache        localStorage `airesume_cache_v1:<hash>` · TTL 24 h · exact-input check
② dedupe       identical in-flight requests share one promise (120 s eviction)
③ slot         max 4 concurrent proxy requests (1–8 via `VITE_AI_CONCURRENCY`) · FIFO queue
④ fetch        POST {prompt, json} · 120 s AbortController timeout (batches 110 s)
⑤ retry        exponential backoff + jitter · 429 → 5 tries (honors Retry-After)
               others → 4 tries · aborts excluded from further retries
⑥ JSON repair  strip ``` fences → strict parse → first{…}last} salvage → throw
⑦ cache write  on success only
```

Stage details in [Services → AI Gateway](../services/ai-gateway.md); the retry math lives in `rawCallProxy`.

## What each failure looks like to the user

| Failure | Detection | UX |
| --- | --- | --- |
| Proxy URL missing | `hasAccess()` false | HR banner + heuristic fallbacks; student sections show a clear message |
| 429 / 5xx | status codes | Backoff retries (5 for 429, honoring `Retry-After`), then `proxyErrorMessage` copy |
| Timeout | 120 s abort (110 s batches) | Retried, then error box |
| Model EOL | 410 / body sniff | "The AI model is temporarily unavailable (it's being updated)" |
| Unparseable JSON | `parseJsonResponse` throws | Section error box; HR path falls back per candidate |
| One file unreadable | `extractText` → null | That candidate fails ("Could not read this file"); the rest still process |
| Whole batch AI failure | `evaluateBatch` throw | Per-candidate heuristic fallback, `usedFallback` toast |
| User cancels | `{cancelled}` signal | In-flight batch finishes; remaining work skipped; reported in summary |
| Storage quota exceeded | IndexedDB error sniff | Specific "device storage full" toast + usage meter |
| Cloud sync fails (CORS/offline) | fetch error | Console warning only — local store stays authoritative |

## Design principles behind the machinery

1. **Never call twice for the same answer.** Cache + dedupe make "Run All" and re-runs nearly free.
2. **Fail per-unit, not per-page.** One bad section/candidate never takes down siblings.
3. **Every AI feature has a non-AI twin.** The fallback evaluator keeps HR functional offline (clearly labeled).
4. **Errors are user-copy.** `proxyErrorMessage` outputs are written for humans and rendered directly.
5. **Protect the upstream.** Concurrency slots + backoff exist because the proxy is free-tier.

---

**Related pages:** [Services → AI Gateway](../services/ai-gateway.md) · [Ranking Math → Fallbacks](./ranking-math.md#the-fallback-evaluator) · [Operations → Troubleshooting](../operations/troubleshooting.md)
