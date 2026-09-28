import { describe, it, expect, vi } from "vitest";

vi.mock("../config/ai", () => ({
  hasAccess: () => false,
}));

vi.mock("../gemini", () => ({
  GeminiService: {
    expandKeywords: vi.fn().mockRejectedValue(new Error("unavailable")),
    evaluateBatch: vi.fn(),
  },
}));

import {
  keywordCoverage,
  aggregateScores,
  expandKeywords,
  runHrAnalysis,
} from "../hrScoring";
import { GeminiService } from "../gemini";

describe("keywordCoverage", () => {
  it("computes the percentage of keywords present in the resume", () => {
    const resume = "Experienced React developer with strong HTML and CSS skills.";
    const keywords = ["react", "html", "css", "python"];
    expect(keywordCoverage(resume, keywords)).toBe(75);
  });

  it("is case-insensitive", () => {
    expect(keywordCoverage("REACT REACT", ["react"])).toBe(100);
  });

  it("returns 0 for an empty keyword list", () => {
    expect(keywordCoverage("anything", [])).toBe(0);
  });
});

describe("aggregateScores", () => {
  it("produces a weighted total from section ratings", () => {
    const result = {
      ratings: {
        skills: 80,
        experience: 60,
        education: 50,
        projects: 40,
        keywordMatch: 70,
        overall: 65,
      },
    };
    const scores = aggregateScores(result);
    expect(scores.skills).toBe(80);
    expect(scores.keywordMatch).toBe(70);
    expect(scores.total).toBe(Math.round(80 * 0.25 + 60 * 0.25 + 50 * 0.15 + 40 * 0.15 + 70 * 0.2));
  });

  it("clamps values to 0-100 and tolerates missing fields", () => {
    const scores = aggregateScores({ ratings: { skills: 150 } });
    expect(scores.skills).toBe(100);
    expect(scores.experience).toBe(0);
    expect(scores.overall).toBe(0);
  });

  it("handles an empty ratings object", () => {
    const scores = aggregateScores({});
    expect(scores.total).toBe(0);
  });
});

describe("expandKeywords", () => {
  it("falls back to the original keyword list when Gemini is unavailable", async () => {
    const result = await expandKeywords("react, html, css");
    expect(result).toEqual(["react", "html", "css"]);
  });

  it("deduplicates the fallback list", async () => {
    const result = await expandKeywords("React, react, HTML");
    expect(result).toEqual(["react", "html"]);
  });
});

describe("runHrAnalysis usedFallback flag", () => {
  const file = () =>
    new File(["Experienced React developer with HTML and CSS skills."], "resume.txt", {
      type: "text/plain",
    });

  it("does not flag usedFallback when Gemini succeeds", async () => {
    vi.mocked(GeminiService.evaluateBatch).mockResolvedValue({
      "0": {
        name: "Alex Doe",
        skills: ["React"],
        ratings: { skills: 80, experience: 60, education: 50, projects: 40, keywordMatch: 70 },
      },
    });

    const result = await runHrAnalysis({
      files: [file()],
      rules: "Looking for a React developer.",
      keywords: "react",
      mode: "ai",
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].evaluation.usedFallback).toBe(false);
  });

  it("flags usedFallback only when Gemini fails", async () => {
    vi.mocked(GeminiService.evaluateBatch).mockRejectedValue(new Error("boom"));

    const result = await runHrAnalysis({
      files: [file()],
      rules: "Looking for a React developer.",
      keywords: "react",
      mode: "ai",
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].evaluation.usedFallback).toBe(true);
  });
});
