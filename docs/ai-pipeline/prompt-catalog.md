# Prompt Catalog

> 🧠 AI Pipeline · Next: [Reliability](./reliability.md)

All prompts live in `buildPrompt()` in `src/services/gemini.js`. Every one demands **only valid JSON, no markdown, no explanation** and receives the resume (or input) fenced in `"""` blocks.

## Shared preamble

```
You are an expert career advisor and AI recruitment specialist. Analyze the
following resume and return a JSON object. No markdown, no code fences, no
explanation — only valid JSON.
```

## Catalog

| # | Prompt key | Intent | Output schema (abridged) |
| --- | --- | --- | --- |
| 1 | `parseResume` | Structured extraction | `{name, email, phone, location, linkedin, summary, skills[], experience[{company,role,duration,highlights[]}], education[], projects[], certifications[]}` — empty string/array when missing |
| 2 | `summary` | 2–3 sentence professional summary | `{summary}` |
| 3 | `readiness` | Placement readiness | `{score 0-100, breakdown{skills,experience,education,projects} each {score 0-25, max:25, note}, strengths[], weaknesses[]}` |
| 4 | `skillGap` | Market comparison | `{currentSkills[], inDemandSkills[], gaps[], analysis}` |
| 5 | `targetRoles` | Role-fit cards derived **from the resume's actual domain** | `{roles[3-4]{id, title, icon(emoji), score, strengths[2-3], gaps[2-3]}}` |
| 6 | `skillDomains` | Competency areas (no invented domains) | `{domains[4-5]{category, score, target, icon, color(Tailwind gradient class)}}` |
| 7 | `missingSkills` | Prioritized gaps + free resources | `{missingSkills[{skill, importance(high\|medium\|low), reason, resource}]}` |
| 8 | `improvements` | Resume fixes | `{improvements[{section, issue, suggestion, priority}]}` |
| 9 | `projects` | Project ideas | `{recommendedProjects[{title, description, technologies[], difficulty, reason}]}` |
| 10 | `certifications` | Cert recommendations | `{recommendedCertifications[{name, provider, description, relevance, url}]}` |
| 11 | `roadmap` | 30/60/90-day plan | `{roadmap{30days, 60days, 90days} each [{week, focus, actions[], expectedOutcome}]}` |
| 12 | `dsa` | DSA prep | `{recommendations{topics[{topic,importance,reason}], practicePlan[{week,topics[],problemsToSolve}], resources[{name,type,url}]}}` |
| 13 | `interviewQuestions` | Q&A bank | `{questions[{category, question, expectedAnswer, preparationTip}]}` |
| 14 | `expandKeywords` | Recruiter keyword expansion (its own preamble) | `{keywords[]}` — originals kept, ≤60, lowercase, unique |
| 15 | `evaluateCandidate` | Single-candidate job fit | `{name, email, phone, headline, skills[], matchedKeywords[], missingKeywords[]≤8, sections{experience,education,projects,skills} each {present,quality,note}, ratings{skills,experience,education,projects,keywordMatch,overall}, strengths[3-5], concerns[2-4], rationale}` |
| 16 | `evaluateBatch` | Batch of candidates in one call | map keyed `"0","1",…` matching `CANDIDATE <n>` blocks; same eval shape each; explicit "evaluate EVERY candidate independently — do not average or reuse" instruction |

## Design conventions (why the prompts look like this)

- **Explicit schemas, key-by-key** — the model gets the exact shape; `normalizeEvaluation` only papers over small misses.
- **Anti-hallucination clauses** — "Based ONLY on the actual skills…", "Do not invent domains absent from the resume", "Never average, merge, or reuse strengths across candidates".
- **Derive roles from the resume's domain** — a civil-engineering resume gets civil roles, not CS roles.
- **`keywordMatch` must reflect keyword coverage** — keeps the one dimension recruiters can verify themselves honest.
- **JSON-only repeated at top** — models that drift to prose get caught by `parseJsonResponse`'s salvage path (see [Reliability](./reliability.md)).

The copilot prompt is built separately in `services/hrChat.js` — see [Copilot](./copilot.md).

---

**Related pages:** [Reliability](./reliability.md) · [Student Flow](./student-flow.md) · [Ranking Math](./ranking-math.md) · [Services → AI Gateway](../services/ai-gateway.md)
