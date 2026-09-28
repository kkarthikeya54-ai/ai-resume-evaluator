# Test Suites

> 🧪 Testing · Next: [Quality Gates](./quality-gates.md)

Run with `npm test` (= `vitest run`). Colocated in `__tests__/` folders. **108 tests across 12 files, all green** (run ≈ 6 s).

## The suites

| File | Covers |
| --- | --- |
| `src/services/__tests__/fileParser.test.js` | Extension detection, supported-file gate, `extractText` paths, `isSparse` |
| `src/services/__tests__/gemini.test.js` | `parseJsonResponse`: clean JSON, fenced JSON, prose-wrapped salvage, invalid input |
| `src/services/__tests__/hrScoring.test.js` | `truncateResume`, `keywordCoverage`, `aggregateScores` (weighted total), `expandKeywords` dedupe/fallback, `runHrAnalysis` (progress, failures, ranking), `generateCandidatesCsv` escaping |
| `src/services/__tests__/hrChat.test.js` | Copilot prompt structure: grounding sections, history window, off-topic guard |
| `src/services/__tests__/hrStore.test.js` | Candidate sessionStorage cache + CSV helper |
| `src/services/__tests__/storageUtils.test.js` | `formatBytes` across unit ranges |
| `src/services/__tests__/localScoring.test.js` | The zero-token local engine: skill/degree/experience detectors, `localEvaluate` shape, keyword matching |
| `src/services/__tests__/perfPipeline.test.js` | `salvageTopLevelBlocks` (partial-JSON recovery), `extractCache` put/get/clear, `runHrAnalysis` extraction-phase progress |
| `src/services/__tests__/chatRankContext.test.js` | `extractRankReferences` ("10th", "top 3", ordinals), `selectChatContext` rank integration |
| `src/services/__tests__/copilotActions.test.js` | Copilot shortlist actions: parse, rank resolution, application |
| `src/components/hr/__tests__/KanbanBoard.test.js` | Kanban stage grouping logic |
| `src/landing/utils/__tests__/scroll.test.js` | **19 tests** for the landing scroll store: knee re-measurement (clamp + no-showcase fallback), all 11 phase boundaries (bound±ε), story-fraction mapping, resize re-anchoring that preserves story position against pre-resize document height, poll sync, dispose, StrictMode double-init |
| `src/utils/__tests__/authErrors.test.js` | Firebase auth error → human message mapping |

## Conventions

- Plain `describe/it/expect`; fake timers where timing matters (scroll store).
- Browser-global-dependent code (the scroll store) is driven through a stubbed `window`/`document` harness — no jsdom, keeping the node environment fast.
- Tests target **pure logic**: services, utils, prompts. The seam is deliberate — every module's exports are functions, so harnessing is trivial.

## Deliberately not unit-tested (and why)

| Area | Covered instead by |
| --- | --- |
| React components | The live verification workflow ([next page](./verification.md)) — component tests would mock away exactly the interactions that matter |
| pdfjs extraction on real files | Verified with real PDFs through the genuine File-API path during verification |
| Cloud Functions (legacy) + HR API Worker | CORS helpers asserted headlessly; endpoints verified against the emulator/deployed worker during deploys |
| CSS/motion | `prefers-reduced-motion` behavior checked live; pixel-sampled previews for critical visuals |
| Theme contrast / hover readability | The static UI audit (`npm run test:ui`, [UI Regression](./ui-regression.md)) + the in-browser sweep harness |

If you add pure logic to `src/services/`, it belongs in a colocated `__tests__` file — that's the house style.

---

**Related pages:** [Quality Gates](./quality-gates.md) · [Verification Workflow](./verification.md) · [Services](../services/README.md)
