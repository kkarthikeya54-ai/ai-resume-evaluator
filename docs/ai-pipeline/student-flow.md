# Student Flow

> 🧠 AI Pipeline · Prev: [Reliability](./reliability.md) · Next: [Ranking Math](./ranking-math.md)

How `/app` turns one resume into ten independent AI results.

## Trigger chain

```
UploadPage: extractText → saveResumeText → navigate /app (state.resumeText)
AppPage auto-run (once per sessionId+hash)  or  "⚡ Run All Analyses" click
  → dispatchRunAnalyses(resumeText)          [window CustomEvent]
  → 10 sections each: subscribeToRun → useGemini.execute(...)
```

The auto-run guard: `autoRanKey` ref stores `${sessionId}:${hash(resumeText)}` — revisits with the same resume don't re-dispatch (and the 24 h cache would absorb it anyway).

## The ten sections

| Section | Prompt(s) | Renders while loading |
| --- | --- | --- |
| ResumeParser | — (paste/edit panel) | — |
| ResumeAnalyzer | `summary` | SkeletonStack |
| ReadinessScore | `readiness` | SkeletonDonut + 4 ribbons |
| TargetRoleSwitcher | `targetRoles` + `skillDomains` | SkeletonStack |
| SkillsGap | `skillGap` + `missingSkills` | SkeletonStack ×2 |
| ResumeImprovements | `improvements` | SkeletonStack |
| RecommendedContent | `projects` + `certifications` | SkeletonStack ×2 |
| Roadmap | `roadmap` | SkeletonStack |
| DSARecommend | `dsa` | SkeletonStack |
| InterviewPrep | `interviewQuestions` | SkeletonStack |

Contract everywhere: **`loading && !data → skeleton`** — cached results never flash placeholders. See [Motion & Loading](../frontend/motion-and-loading.md).

## Concurrency reality

Ten sections fire simultaneously into a **4-slot** proxy queue (the default; 1–8 via `VITE_AI_CONCURRENCY`) — the first four call out, the rest queue FIFO. Combined with dedupe, this is why a "Run All" burst stays within free-tier limits. Roughly: sections resolve in waves of 4.

## Client-side derived logic

- **ReadinessScore** derives dimension %s (`score/max`), colors by band (≥75 primary, ≥50 amber, else red), and persists the score via `recordEvaluation` (stats + tier) after each fresh result.
- **TargetRoleSwitcher** re-renders the domain chart per selected role.
- **SkillDistributionChart** is lazy-loaded (code-split) behind a Suspense skeleton.

## Anti-cost measures (summary)

| Measure | Where | Effect |
| --- | --- | --- |
| 24 h result cache | gateway | Same resume → same answers, free, for a day |
| In-flight dedupe | gateway | Bursts never double-call |
| Auto-run-once guard | AppPage | Revisits don't re-dispatch |
| Concurrency slots | gateway | No stampede, predictable waves |

---

**Related pages:** [Prompt Catalog](./prompt-catalog.md) · [Reliability](./reliability.md) · [Frontend → Pages → AppPage](../frontend/pages.md) · [Frontend → Motion & Loading](../frontend/motion-and-loading.md)
