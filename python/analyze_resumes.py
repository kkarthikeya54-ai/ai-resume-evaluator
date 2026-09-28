#!/usr/bin/env python3
"""AI-Driven Resume Evaluation - Standalone heuristic resume analysis script.

This script is the offline / fallback companion to the AI-Driven Resume
Evaluation web app.
The live app scores resumes with Google Gemini (NLP/ML); this script mirrors
the app's deterministic keyword-heuristic scorer so results can be reproduced
or generated without an API key (e.g. for milestone artifacts, CI, or demos).

Usage:
    python analyze_resumes.py --keywords "python, react, sql" resume1.txt resume2.md
    python analyze_resumes.py --keywords-file keywords.txt --output result.json *.txt

Scoring (identical weights to src/services/hrScoring.js):
    skills 25% | experience 25% | education 15% | projects 15% | keyword match 20%
    overall = 0.7 * keyword coverage + 0.3 * section structure
"""

import argparse
import json
import re
import sys
from pathlib import Path

SECTION_PATTERNS = {
    "skills": re.compile(r"skill|technolog|proficien|language", re.IGNORECASE),
    "experience": re.compile(r"experience|work history|employment|role", re.IGNORECASE),
    "education": re.compile(r"education|bachelor|master|degree|university|college", re.IGNORECASE),
    "projects": re.compile(r"project|built|developed|github", re.IGNORECASE),
}


def read_resume(path):
    """Read a plain-text resume (.txt / .md). Returns (text, error)."""
    ext = Path(path).suffix.lower()
    if ext not in (".txt", ".md"):
        return None, f"unsupported extension '{ext}' (supports .txt / .md)"
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace"), None
    except OSError as exc:
        return None, str(exc)


def keyword_coverage(resume_text, keywords):
    text = (resume_text or "").lower()
    kw = [str(k).strip().lower() for k in keywords if str(k).strip()]
    if not kw:
        return 0
    hits = sum(1 for k in kw if k in text)
    return round((hits / len(kw)) * 100)


def evaluate(resume_text, file_name, keywords):
    """Mirror fallbackEvaluation() + aggregateScores() in hrScoring.js."""
    coverage = keyword_coverage(resume_text, keywords)
    text = resume_text or ""
    sections = {
        key: bool(pat.search(text))
        for key, pat in SECTION_PATTERNS.items()
    }
    base = sum(1 for v in sections.values() if v)
    structure = min(100, round((base / len(sections)) * 100))
    overall = round(0.7 * coverage + 0.3 * structure)

    ratings = {
        "skills": 60 if sections["skills"] else 0,
        "experience": 60 if sections["experience"] else 0,
        "education": 60 if sections["education"] else 0,
        "projects": 60 if sections["projects"] else 0,
        "keywordMatch": coverage,
        "overall": overall,
    }
    total = round(
        ratings["skills"] * 0.25
        + ratings["experience"] * 0.25
        + ratings["education"] * 0.15
        + ratings["projects"] * 0.15
        + ratings["keywordMatch"] * 0.2
    )

    return {
        "fileName": file_name,
        "name": Path(file_name).stem,
        "coverage": coverage,
        "sections": sections,
        "ratings": ratings,
        "total": total,
        "overall": overall,
    }


def parse_keywords(arg, keywords_file):
    kw = []
    if keywords_file:
        kw = [
            line.strip()
            for line in Path(keywords_file).read_text(encoding="utf-8", errors="replace").splitlines()
            if line.strip()
        ]
    if arg:
        kw.extend(
            part.strip()
            for part in re.split(r"[,;\n]+", arg)
            if part.strip()
        )
    seen, unique = set(), []
    for k in kw:
        key = k.lower()
        if key not in seen:
            seen.add(key)
            unique.append(k)
    return unique


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("resumes", nargs="+", help="One or more .txt/.md resume files")
    parser.add_argument("--keywords", default="", help="Comma/line separated job keywords")
    parser.add_argument("--keywords-file", default="", help="File with one keyword per line")
    parser.add_argument("--rules", default="", help="Optional job rules (informational only)")
    parser.add_argument("--output", default="", help="Write ranked JSON results to this file")
    args = parser.parse_args(argv)

    keywords = parse_keywords(args.keywords, args.keywords_file)
    if not keywords:
        parser.error("provide --keywords or --keywords-file")

    results = []
    errors = []
    for path in args.resumes:
        text, err = read_resume(path)
        if err:
            errors.append({"file": path, "error": err})
            continue
        results.append(evaluate(text, Path(path).name, keywords))

    results.sort(key=lambda r: r["total"], reverse=True)
    for i, r in enumerate(results, start=1):
        r["rank"] = i

    print("AI-Driven Resume Evaluation - heuristic resume analysis")
    print(f"Keywords ({len(keywords)}): {', '.join(keywords)}")
    if args.rules:
        print(f"Rules: {args.rules[:120]}{'...' if len(args.rules) > 120 else ''}")
    print()
    print(f"{'Rank':<5}{'Name':<24}{'Total':>6}{'Skills':>8}{'Exp':>6}{'Edu':>6}{'Proj':>7}{'Kw':>6}")
    print("-" * 68)
    for r in results:
        print(
            f"#{r['rank']:<4}{r['name'][:24]:<24}{r['total']:>5}%"
            f"{r['ratings']['skills']:>7}%"
            f"{r['ratings']['experience']:>5}%"
            f"{r['ratings']['education']:>5}%"
            f"{r['ratings']['projects']:>6}%"
            f"{r['ratings']['keywordMatch']:>5}%"
        )
    print("-" * 68)
    print(f"{len(results)} evaluated, {len(errors)} failed")

    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  {e['file']}: {e['error']}")

    if args.output:
        payload = {
            "tool": "airesume-heuristic-scorer",
            "keywords": keywords,
            "rules": args.rules,
            "summary": {"evaluated": len(results), "failed": len(errors)},
            "candidates": results,
            "errors": errors,
        }
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True) if out.parent != Path(".") else None
        out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"\nWrote JSON results to {out}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
