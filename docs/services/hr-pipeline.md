# HR Pipeline & Copilot

> ⚙️ Services · Prev: [AI Gateway](./ai-gateway.md) · Next: [Storage](./storage.md)

`hrScoring.js` (the pipeline) and `hrChat.js` (the copilot). Behavior-level walkthroughs: [AI Pipeline → Ranking Math](../ai-pipeline/ranking-math.md) and [→ Copilot](../ai-pipeline/copilot.md).

## `hrScoring.js` — every export

| Export | Purpose |
| --- | --- |
| `truncateResume(text, max=8000)` | Caps prompt size per resume |
| `keywordCoverage(resumeText, keywords)` | % of job keywords found (case-insensitive substring) |
| `aggregateScores(result)` | Clamps 5 AI ratings; computes the weighted total: **skills 25% + experience 25% + education 15% + projects 15% + keywordMatch 20%**; keeps the AI's holistic `overall` separately |
| `fallbackEvaluation(...)` | No-AI evaluator: regex section detection + coverage → `overall = 0.7·coverage + 0.3·structure`; tagged `usedFallback: true` |
| `normalizeEvaluation(raw, ...)` | Merges AI output over the fallback shape — downstream never sees missing fields |
| `expandKeywords(keywords, extraContext)` | AI synonym expansion (≤60), deduped with originals; falls back to plain splitting |
| `runHrAnalysis({files, rules, keywords, onProgress, onCandidate, signal, mode})` | The orchestrator (below). `mode: "ai" \| "local"` overrides engine selection |
| `buildChatCorpus(candidates)` | Text block per candidate for the copilot |
| `selectChatContext(candidates, question, maxChars=12000)` | Relevance-ranked corpus packing (below) |
| `generateCandidatesCsv(candidates)` | Properly escaped CSV: rank, name, file, 5 scores, shortlisted |

Constants (env-tunable): `BATCH_SIZE` (default 3, `VITE_HR_BATCH_SIZE`), `CONCURRENCY` (default 6, `VITE_HR_CONCURRENCY`), `FAST_LOCAL_THRESHOLD` (default **0** — local scoring always; `VITE_HR_FAST_LOCAL_THRESHOLD`), `MAX_RESUME_CHARS = 8000`, `MAX_CONCURRENT_EXTRACTS = 2` (extraction semaphore).

## Engine selection: fast local (default) vs AI (opt-in)

**Local scoring is the default engine at every run size.** Measured on real resumes, free-tier AI batch calls take 90–300+ s **each** (single-resume batches included) and routinely time out — unusable for interactive ranking. The local engine (`localScoring.js`) ranks 500 resumes in seconds with **zero tokens and zero network calls**.

- `FAST_LOCAL_THRESHOLD` (default 0) is the *minimum file count for auto-local mode*: 0 means local always.
- `mode: "local"` forces local at any size; `hasAccess() === false` always uses local.
- `mode: "ai"` opts a run into AI evaluation when a healthy AI endpoint exists (Gemini primary, NVIDIA NIM fallback via the worker proxy).

`localScoring.js` extracts the same candidate shape from resume text: skill-dictionary matching (~90 skills), degree level, years of experience (ranges + claims), project/experience/leadership verb signals, keyword coverage, email/phone/headline. Scores are calibrated to a realistic 35–80 band; evaluations are tagged `local: true`, and the summary reports `mode: "local"`.

**Extraction performance (measured, 500 real PDFs):** all extracted text is cached in IndexedDB (`airesume_extract`, keyed by SHA-256 of file bytes, 7-day TTL, 800-entry cap) — **cold run ≈ 10 s end-to-end, warm re-run ≈ 0.25 s** (parsing skipped entirely). Scanned/image PDFs OCR through a **persistent Tesseract worker pool** (no per-file engine boot) at 1.5× raster scale. Extraction concurrency is capped by a semaphore (2 in flight) so AI calls stay fully parallel. **Progress is two-phase**: `stage: "extracting"` (files read x/y) then `stage: "scoring"` — the UI renders both live instead of one frozen bar.

**AI resilience:** truncated/max-token batch JSON is recovered per candidate by `salvageTopLevelBlocks` (brace-matching salvage in `parseJsonResponse`), so one bad candidate no longer demotes a whole batch; batch proxy calls use a **110 s** timeout (matching the proxy's edge window; aborts are retryable); Cancel can interrupt an in-flight AI call (`cancelable` race); session persistence runs **after** results render (non-blocking).

## `runHrAnalysis` skeleton

```js
validate(files, rules|keywords)
localMode = mode==="local" \|\| files.length >= FAST_LOCAL_THRESHOLD \|\| !hasAccess()   // threshold defaults to 0 → local always
expanded  = localMode ? keywords.split(...) : await expandKeywords(keywords, rules)  // AI only when scoring with AI
batches = chunk(files, 3)
runWithConcurrency(batches, 6, worker, onItem, signal)
  worker(batch):
    extracted = parallel extractWithCache × batch     // IndexedDB cache + 2-slot semaphore
    emit {stage:"extracting", done: extractedCount}   // per-file progress
    emit {stage:"scoring", done: completedFiles}
    evals = readable.map(localEvaluate)               // local mode (default): instant, no tokens
          \| await cancelable(evaluateBatch(...))      // AI mode (opt-in); 110 s timeout
    return extracted.map(toCandidate)                 // normalize + scores + coverage
  onItem: per-file progress {stage, done, total, currentFile, failedCount}
rank: sort by scores.total desc → rank = i+1
return {expandedKeywords, candidates, failed, summary{total, processed, failed, cancelled, hasGemini, mode}}
```

`runWithConcurrency` is a generic pool: N workers pull from a shared index; errors mark the item failed without killing the pool; `signal.cancelled` is checked between items and inside workers (cancelled items are reported, not thrown).

`evaluateBatch` expects the AI to answer `{ "0": eval, "1": eval, … }` matching the `--- CANDIDATE <i> ---` blocks; any missing/unparseable entry falls back per candidate.

## `hrChat.js` — grounded copilot

```js
askHrChat({rules, keywords, candidates, history, question})
  corpus  = selectChatContext(candidates, question, 12000)
  prompt  = buildChatPrompt({rules, keywords, corpus, history, question})
  answer  = await GeminiService.hrChat(prompt)   // json:false → raw text
```

- `selectChatContext`: tokenizes the question (`[a-z][a-z0-9]{2,}`), scores each candidate by term hits across name/file/headline/skills/keywords/strengths/concerns/resumeText, packs the best blocks under 12,000 chars.
- `buildChatPrompt`: the grounding contract — answer **only** from provided data, never invent, and reply with an exact off-topic sentence for unrelated questions. Includes job rules, expanded keywords, the corpus, and the last 16 conversation turns.

---

## Measured performance (500 real PDFs, ~8 KB text each)

Benchmarked in the live app against `C:\…\500_extended_realistic_resumes_COMPLETE` (500 generated resumes):

| Phase | Cold | Warm (cached) |
| --- | --- | --- |
| Fetch + File objects | 1.1–1.3 s | 1.1 s |
| First candidate emitted | 1.3–1.8 s | < 0.2 s |
| **Full run (extract + score + rank)** | **≈ 10 s** | **≈ 0.25 s** |
| Failures | 0 | 0 |
| Score spread / distinct values | 42–70 / 28 | identical (cache returns the same text) |
| Session persistence (500 candidates, 1.4 MB) | put ≈ 120 ms / read ≈ 90 ms | — |

Extract-cache speedup: **≈ 40×** on re-runs. For scale, AI-mode on the free proxy measured 90–300+ s *per batch* (a 500-file run would be hours; local mode makes it seconds). Gates: lint 1.7 s · 108 tests 6.3 s · UI audit 0.2 s · build 8.6 s.

---

**Related pages:** [Ranking Math](../ai-pipeline/ranking-math.md) · [Copilot](../ai-pipeline/copilot.md) · [Storage](./storage.md) (where results persist) · [Testing → Test Suites](../testing/test-suites.md)
