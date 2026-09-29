# Product Overview

> 🧭 Getting Started · Next: [Quickstart](./quickstart.md)

## What this project is

**AI Resume Evaluation** (package name `ai-resume-evaluation`) is a web-based AI system that:

1. **Parses resumes** (PDF, DOCX, plain text, images via OCR) entirely in the browser
2. **Understands them with an LLM** — skills, experience, education, projects, certifications
3. Serves **two distinct roles**, each with its own workspace:

| Role | Workspace | Gets |
| --- | --- | --- |
| 🎓 **Student** | `/upload` → `/app` | Placement-readiness score (0–100, 4-dimension breakdown), skill-gap analysis, missing-skills with free resources, resume improvements, recommended projects & certifications, 30/60/90-day roadmap, DSA plan, interview question bank |
| 🏢 **HR / Recruiter** | `/hr` → `/candidate/:id` | Named hiring sessions, job rules + AI-expanded keywords, multi-resume batch upload, per-candidate AI evaluation with transparent 5-dimension scores, ranked pipeline, side-by-side compare, shortlisting, status tracking, CSV export, Markdown reports, and a grounded AI copilot chat |

Both roles share: a cinematic 3D landing page, onboarding tour, multi-session management, an account profile, and role switching.

## The student journey

```
Signup/Login → Onboarding ("I'm a student", 5-slide tour)
  → /upload : drop file → magic-byte validation → extractText (pdf.js/mammoth/OCR)
  → looksLikeResume sanity check → text saved to localStorage
  → /app auto-runs 10 AI sections (skeleton loaders while generating)
  → readiness score, skill gaps, roadmap, DSA plan, interview prep
```

## The HR journey

```
Onboarding ("I'm hiring") → /hr → create a hiring session
  → enter job rules + keywords → AI expands keywords (originals + synonyms)
  → drop resumes (multi-file, validated) → Process & Rank
  → batches of 3, concurrency 6 → every candidate evaluated & ranked
  → ranked table → candidate reports, compare modal, shortlists
  → Recruiter Copilot answers questions grounded in the actual resumes
```

## Product principles (as implemented)

1. **Local-first privacy.** Files are parsed in the browser (pdf.js, mammoth, tesseract.js). Sessions, resume text, and AI results live in the user's browser (IndexedDB / localStorage). Only resume files optionally move to Supabase Storage and small structured metadata to the HR Worker's KV. See [Data & Privacy](../data-and-privacy/README.md).
2. **Secrets never reach the client.** The LLM key lives server-side; the browser talks to a proxy that injects it. See [Backend](../backend/README.md).
3. **Graceful degradation.** Every AI feature has a non-AI fallback (heuristic keyword/section scoring), so the product never hard-fails. See [AI Pipeline → Fallbacks](../ai-pipeline/ranking-math.md#the-fallback-evaluator).
4. **Accessibility.** WCAG-AA-contrast palette, focus-trapped modals, `prefers-reduced-motion` support, `pointer: fine` gating for hover effects. See [Design System](../frontend/design-system.md).

## Route map

| Route | Guard | Page |
| --- | --- | --- |
| `/` | public | Landing (cinematic 3D) |
| `/login`, `/signup` | redirects signed-in users | Login / Signup |
| `/onboarding` | requires auth; skips if role set | Onboarding |
| `/sessions` | requires auth | SessionsPage (both roles) |
| `/account` | requires auth | Account |
| `/upload` | student role | UploadPage |
| `/app` | student role | AppPage (analysis dashboard) |
| `/hr` | HR role | HrDashboard |
| `/candidate/:candidateId` | HR role | CandidateView |
| `/privacy`, `/terms`, `/refund`, `/cookies` | public | Legal pages |

---

**Related pages:** [Quickstart](./quickstart.md) · [Glossary](./glossary.md) · [System Architecture](../architecture/system-overview.md) · [Data & Privacy](../data-and-privacy/README.md)
