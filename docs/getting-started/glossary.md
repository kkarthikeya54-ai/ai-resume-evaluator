# Glossary

> 🧭 Getting Started · Prev: [Quickstart](./quickstart.md)

Every domain term used across the wiki, defined the way the code uses it.

## Product & domain

| Term | Meaning |
| --- | --- |
| **Session** | A named workspace unit (one per job opening for HR, one per target position for students) stored in IndexedDB. Holds rules, keywords, resumes, and results. |
| **Candidate** | One uploaded resume in an HR session after parsing + evaluation: `{id, fileName, resumeText, evaluation, coverage, scores, rank, shortlisted?, status?}`. |
| **Evaluation** | The structured AI (or fallback) judgment of one candidate: name/headline/skills, matched & missing keywords, per-section quality, ratings, strengths, concerns, rationale. |
| **Readiness score** | Student-facing 0–100 number with a 4×25 breakdown (skills, experience, education, projects). |
| **Match score / total** | HR-facing weighted candidate score (see [Ranking Math](../ai-pipeline/ranking-math.md)). |
| **Coverage** | `keywordCoverage` — % of job keywords found (case-insensitive substring) in a resume. |
| **Tier** | Letter rank from a score: S+ ≥90, S ≥80, A ≥70, B ≥60, C ≥50, else D. |
| **Expanded keywords** | Original job keywords plus AI-generated synonyms/related terms (max 60, deduped). Drives matching and coverage. |
| **Fallback evaluation** | The heuristic (non-AI) evaluator used when the AI is unreachable; tagged `usedFallback: true` so the UI warns recruiters. |
| **Copilot / Recruiter Copilot** | The HR chat panel; answers are grounded strictly in the session's candidate corpus. |
| **Corpus** | The relevance-selected text blocks of candidates fed to the copilot prompt (≤12,000 chars). |

## Architecture & infrastructure

| Term | Meaning |
| --- | --- |
| **Local-first** | The storage philosophy: files, sessions, and results live in the browser (IndexedDB/localStorage/sessionStorage); the cloud is an optional mirror. |
| **AI proxy** | The server-side endpoint (Cloudflare Worker or `analyzeResume` Cloud Function) that holds the AI key and forwards prompts to the LLM. |
| **Magic bytes** | The file-signature bytes used to validate uploads (`%PDF`, `PK`, PNG/JPEG headers…) before parsing. |
| **Sparse text** | Extracted text under 40 non-whitespace chars — triggers OCR fallback for scanned resumes. |
| **In-flight dedupe** | Identical concurrent AI requests share one promise instead of calling twice. |
| **Concurrency slots** | The max-2 simultaneous proxy requests enforced by a FIFO promise queue. |
| **Batch** | A chunk of up to 3 candidates evaluated in one LLM call. |
| **Signal** | The plain `{cancelled}` object threaded through the HR pipeline for cooperative cancellation. |
| **Landing knee** | The scroll-length handoff between the landing's 3D story track and the post-track content; measured and re-anchored on resize (see `src/landing/utils/scroll.js`). |
| **Phase** | One of the 11 story chapters of the cinematic landing, driven by scroll fraction. |
| **Skeleton (loading)** | Placeholder UI (shimmer bars/cards) shown while AI content generates; part of the motion layer. |
| **Velaris** | The raw-WebGL ambient background shader behind app pages. |
| **PWA** | Progressive Web App — installable, offline app shell via Workbox service worker. |

## Storage keys & collections

| Key / path | Holds |
| --- | --- |
| IndexedDB `airesume_sessions` | All sessions (both roles), incl. resume bytes |
| IndexedDB `airesume_hr` | Legacy single HR session (migrated once) |
| `localStorage: airesume_role_<uid>` | The user's chosen role |
| `localStorage: airesume_resume_text_<uid>` | Student resume text |
| `localStorage: airesume_resume_metadata` | Upload metadata list |
| `localStorage: airesume_cache_v1:<hash>` | AI result cache (24 h TTL) |
| `sessionStorage: airesume_hr_candidates` | Current-tab candidate cache |
| Firestore `users/{uid}` | Profile + usage stats |
| Workers KV (`hr:session:<uid>:<id>`) | Cloud mirror of HR sessions, served by the HR API Worker |
| Storage `resumes/{uid}/…` | (Optional cloud path) resume files |

---

**Related pages:** [Quickstart](./quickstart.md) · [Reference → Project Map](../reference/project-map.md) · [Data & Privacy](../data-and-privacy/README.md)
