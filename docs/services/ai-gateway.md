# AI Gateway (`gemini.js`)

> ⚙️ Services · Prev: [Parsing](./parsing.md) · Next: [HR Pipeline & Copilot](./hr-pipeline.md)

The single choke-point for all LLM traffic. **No AI key here** — it POSTs `{ prompt, json }` to the configured proxy (see [Backend → Worker Proxy](../backend/worker-proxy.md)).

## Request lifecycle (every call)

```
generate(type, input)
 1. cache check      localStorage `airesume_cache_v1:<hash(type:input)>`, TTL 24 h,
                     stored input must match exactly (hash-collision defense)
 2. in-flight dedupe identical concurrent calls share ONE promise (120 s eviction)
 3. concurrency slot max 4 simultaneous proxy requests (FIFO queue, 1–8 via `VITE_AI_CONCURRENCY`)
 4. fetch            POST {prompt, json} · 120 s AbortController timeout (batches 110 s)
 5. retry loop       exponential backoff 1.5s·2ⁿ + jitter (3s base for 429);
                     budgets: 429 → 5 retries (honors Retry-After), others → 4
 6. JSON repair      parseJsonResponse: strip fences → strict parse →
                     first-{-to-last-} salvage → throw
 7. cache write      on success only
```

`GeminiService.hrChat(prompt)` is the only `json:false` path — raw text for the copilot.

## The 16 prompts (`buildPrompt`)

Every prompt demands **only valid JSON** with an explicit schema. Full prompt text lives in `src/services/gemini.js`; behavior-level docs: [AI Pipeline → Prompt Catalog](../ai-pipeline/prompt-catalog.md).

| Method | Prompt | Output (abridged) |
| --- | --- | --- |
| `parseResume` | `parseResume` | name/contact/skills/experience/education/projects/certifications |
| `generateSummary` | `summary` | `{summary}` |
| `generateReadiness` | `readiness` | `{score, breakdown{4×(score,max,note)}, strengths, weaknesses}` |
| `generateSkillGap` | `skillGap` | `{currentSkills, inDemandSkills, gaps, analysis}` |
| `generateTargetRoles` | `targetRoles` | `{roles[3-4]{id,title,icon,score,strengths,gaps}}` |
| `generateSkillDomains` | `skillDomains` | `{domains[4-5]{category,score,target,icon,color}}` |
| `generateMissingSkills` | `missingSkills` | `{missingSkills[{skill,importance,reason,resource}]}` |
| `generateImprovements` | `improvements` | `{improvements[{section,issue,suggestion,priority}]}` |
| `generateProjects` | `projects` | `{recommendedProjects[]}` |
| `generateCertifications` | `certifications` | `{recommendedCertifications[]}` |
| `generateRoadmap` | `roadmap` | `{roadmap{30days,60days,90days}}` |
| `generateDSA` | `dsa` | `{recommendations{topics,practicePlan,resources}}` |
| `generateInterviewQuestions` | `interviewQuestions` | `{questions[{category,question,expectedAnswer,preparationTip}]}` |
| `expandKeywords` | `expandKeywords` | `{keywords[]}` ≤60 (originals + synonyms) |
| `evaluateCandidate` | `evaluateCandidate` | full single-candidate evaluation |
| `evaluateBatch` | `evaluateBatch` | map keyed `"0","1",…` of evaluations |
| `hrChat` | (built by hrChat.js) | raw text answer |

Prompt-design conventions: resume text is fenced in `"""` blocks; schemas enumerate every key; "Base every rating on RULES and KEYWORDS" style grounding; JSON-only instruction repeated at top and bottom.

## Error surface

`proxyErrorMessage(status, body)` converts failures into user-facing copy: 410 → "model is being updated", 401/403 → config problem, 429 → "busy, try shortly", 5xx → "temporary problem", else a truncated detail. These strings land directly in section error boxes.

## Cost-control levers (why this module exists in this shape)

| Lever | Effect |
| --- | --- |
| 24 h cache | Re-analyzing the same resume is free for a day |
| In-flight dedupe | 10 sections firing together never double-call |
| Concurrency 4 | Protects the free-tier proxy from stampedes (default; 1–8 via `VITE_AI_CONCURRENCY`) |
| Batch evaluation (HR) | 1 LLM call per 3 candidates instead of 3 calls |
| 8,000-char truncation | Caps per-resume prompt size |

---

**Related pages:** [Prompt Catalog](../ai-pipeline/prompt-catalog.md) · [Reliability](../ai-pipeline/reliability.md) · [Backend → Worker Proxy](../backend/worker-proxy.md)
