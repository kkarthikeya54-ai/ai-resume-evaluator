import json
import tempfile
import unittest
from pathlib import Path

from analyze_resumes import evaluate, keyword_coverage, main

RESUME = """Shritej Koneru
Skills: Python, React, SQL, Machine Learning
Experience: Frontend developer for 3 years
Education: B.Tech Computer Science, 2025
Projects: Built an AI chatbot and a stock dashboard (github.com/shritej)
"""


class TestKeywordCoverage(unittest.TestCase):
    def test_partial_coverage(self):
        self.assertEqual(keyword_coverage("python and sql", ["python", "react", "sql"]), 67)

    def test_full_coverage(self):
        self.assertEqual(keyword_coverage("python react sql", ["python", "react", "sql"]), 100)

    def test_phrase_match(self):
        self.assertEqual(
            keyword_coverage("machine learning experience", ["machine learning", "react"]), 50
        )

    def test_empty_keywords(self):
        self.assertEqual(keyword_coverage("anything", []), 0)


class TestEvaluate(unittest.TestCase):
    def setUp(self):
        self.result = evaluate(RESUME, "shritej.txt", ["python", "react", "sql", "docker"])

    def test_sections_detected(self):
        self.assertTrue(self.result["sections"]["skills"])
        self.assertTrue(self.result["sections"]["experience"])
        self.assertTrue(self.result["sections"]["education"])
        self.assertTrue(self.result["sections"]["projects"])

    def test_ratings(self):
        ratings = self.result["ratings"]
        self.assertEqual(ratings["skills"], 60)
        self.assertEqual(ratings["experience"], 60)
        self.assertEqual(ratings["keywordMatch"], 75)

    def test_total_weighted(self):
        self.assertEqual(self.result["total"], 63)

    def test_missing_sections_score_zero(self):
        sparse = evaluate("just a line", "sparse.txt", ["python"])
        self.assertEqual(sparse["ratings"]["projects"], 0)
        self.assertLess(sparse["total"], 50)


class TestMainCli(unittest.TestCase):
    def test_ranked_output_and_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.txt").write_text(RESUME, encoding="utf-8")
            (root / "b.txt").write_text("nothing relevant here", encoding="utf-8")
            out = root / "result.json"
            code = main(
                [
                    "--keywords", "python, react",
                    "--output", str(out),
                    str(root / "a.txt"),
                    str(root / "b.txt"),
                ]
            )
            self.assertEqual(code, 0)
            payload = json.loads(out.read_text(encoding="utf-8"))
            self.assertEqual(len(payload["candidates"]), 2)
            self.assertEqual(payload["candidates"][0]["rank"], 1)
            self.assertGreater(
                payload["candidates"][0]["total"], payload["candidates"][1]["total"]
            )

    def test_unsupported_extension_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            pdf = root / "resume.pdf"
            pdf.write_bytes(b"%PDF-1.4 fake")
            code = main(["--keywords", "python", str(pdf)])
            self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
