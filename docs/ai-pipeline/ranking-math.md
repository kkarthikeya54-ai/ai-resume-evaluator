# Ranking Math

> 🧠 AI Pipeline · Prev: [Student Flow](./student-flow.md) · Next: [Copilot](./copilot.md)

The HR pipeline (`runHrAnalysis` in `services/hrScoring.js`) — every step from files to a ranked list.

## The full walk-through

```
validate        files? rules or keywords?
   ▼
expandKeywords  1 AI call — originals preserved + synonyms, ≤60, deduped
   ▼
chunk           files → batches of 3 (BATCH_SIZE)
   ▼
pool            runWithConcurrency(batches, 6, worker, onItem, signal)
  worker(batch):
    ① extract    extractText × batch in parallel (null → candidate fails)
    ② truncate   8,000 chars each
    ③ evaluate   evaluateBatch — 1 LLM call per batch
                 prompt = JOB RULES + JOB KEYWORDS + --- CANDIDATE i --- blocks
                 response = { "0": eval, "1": eval, "2": eval }
    ④ normalize  normalizeEvaluation (AI merged over fallback shape)
                 or fallbackEvaluation per candidate (usedFallback: true)
    ⑤ build      {id, fileIndex, fileName, resumeText, evaluation,
                 coverage, scores, rank: 0}
  onItem: progress {stage:"processing", done, total, currentFile, failedCount}
   ▼
collect         candidates / failed / cancelled (signal-aware)
   ▼
rank            sort by scores.total desc → rank = i+1
   ▼
return          {expandedKeywords, candidates, failed,
                 summary{total, processed, failed, cancelled, hasGemini}}
```

## The weighted score

```js
total = 0.25·skills + 0.25·experience + 0.15·education
      + 0.15·projects + 0.20·keywordMatch      // each 0–100, clamped
```

The AI's holistic `overall` rating is kept and displayed but **ranking uses the transparent weighted total** — a deliberate product choice: every dimension that produced a rank is a visible column in the table, so recruiters can audit the ordering.

## Why batch size 3, concurrency 6

- **3**: small enough that one weak candidate doesn't drown others in a shared prompt; large enough to cut LLM calls by 3×. The response is keyed per candidate, so partial parse failures degrade per-candidate.
- **6**: `CONCURRENCY` (default 6, `VITE_HR_CONCURRENCY`) is the HR pipeline's *own* worker pool — independent of the student dashboard's 4-slot AI gateway queue. 6 is a deliberate overhang for a local-first app: 6 parallel batches × 3 candidates each keeps plenty of headroom before free-tier proxy limits bite, and the pool is fully cooperative with `signal.cancelled`.

## The fallback evaluator

When the AI is unreachable (or a candidate's evaluation is unparseable):

```
sections  = regex-detect skills / experience / education / projects
structure = present_sections / 4 × 100
overall   = 0.7·keywordCoverage + 0.3·structure
```

The result is tagged `usedFallback: true`, carries a rationale string saying it's heuristic, and HrDashboard raises a toast asking recruiters to review those scores manually. Ratings default to 60 for present sections — deliberately conservative.

## CSV & corpus helpers

- `generateCandidatesCsv` — escaped CSV (rank, name, file, 5 scores, shortlisted); it is also the generator behind the cloud CSV export (`exportHrSessionCsv` in `hrBackend.js` builds it client-side from the session fetched from the [HR API Worker](../backend/hr-api.md)).
- `selectChatContext` / `buildChatCorpus` — feed the copilot; detailed in [Copilot](./copilot.md).

---

**Related pages:** [Copilot](./copilot.md) · [Services → HR Pipeline](../services/hr-pipeline.md) · [Backend → HR API Worker](../backend/hr-api.md) · [Testing → Test Suites](../testing/test-suites.md) (hrScoring tests)
