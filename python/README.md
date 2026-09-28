# AI-Driven Resume Evaluation — Python Analysis Script

This folder contains a standalone, dependency-free Python re-implementation of
the AI-Driven Resume Evaluation and Parsing System's resume scoring heuristic. It exists as a milestone artifact and an
offline reproducibility tool.

## Live app vs. this script

| | Live app | This script |
|---|---|---|
| Scoring | Google Gemini (NLP/ML) via `VITE_GEMINI_API_KEY` | Deterministic keyword/section heuristic |
| Resume input | PDF, DOCX, TXT/MD, RTF, images (OCR) | TXT / MD only |
| Output | Rich candidate report + chat copilot | Ranked table / JSON |
| Dependencies | React + JS + Gemini API | Python 3 stdlib only |

The live web app uses Gemini for NLP/ML evaluation (the ML component of the
product's stack). When Gemini is unavailable it falls back to the exact heuristic
mirrored here, so scores are consistent with `--no-gemini` runs of the script.

## Usage

```bash
# Score one or more plain-text resumes against job keywords
python analyze_resumes.py --keywords "python, react, sql, machine learning" resume1.txt resume2.md

# Read keywords from a file (one per line) and write ranked JSON
python analyze_resumes.py --keywords-file keywords.txt --output result.json *.txt

# Optional job rules context (shown in the report header)
python analyze_resumes.py --keywords "python" --rules "Senior ML Engineer" resume.txt
```

## Scoring model (mirrors `src/services/hrScoring.js`)

- `keywordMatch` — fraction of job keywords found (case-insensitive substring).
- `skills` / `experience` / `education` / `projects` — 60 when the section is
  detected, 0 otherwise.
- `overall` = `0.7 * keywordMatch + 0.3 * structure` (structure = fraction of the
  four sections present).
- `total` = weighted: skills 25% + experience 25% + education 15% +
  projects 15% + keywordMatch 20%.
- Candidates are ranked by `total` (highest first).

## Tests

```bash
python -m unittest tests.py
```
