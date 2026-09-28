import { describe, it, expect } from "vitest";
import { extractRankReferences, selectChatContext } from "../hrScoring";

describe("extractRankReferences", () => {
  it("resolves positional ordinals like '10th position candidate'", () => {
    expect(extractRankReferences("explain about the 10th position candidate", 12)).toEqual(new Set([10]));
  });
  it("resolves word ordinals like 'tenth candidate'", () => {
    expect(extractRankReferences("explain about the tenth candidate", 12)).toEqual(new Set([10]));
  });
  it("resolves 'rank 3' and '#5' and 'candidate 4'", () => {
    expect(extractRankReferences("who is rank 3?", 12)).toEqual(new Set([3]));
    expect(extractRankReferences("#5 please", 12)).toEqual(new Set([5]));
    expect(extractRankReferences("candidate 4 vs candidate 9", 12)).toEqual(new Set([4, 9]));
  });
  it("expands 'top 3' to ranks 1..3", () => {
    expect(extractRankReferences("summarize top 3", 12)).toEqual(new Set([1, 2, 3]));
  });
  it("maps best/top to 1 and worst/last to the lowest rank", () => {
    expect(extractRankReferences("who is the best?", 5)).toEqual(new Set([1]));
    expect(extractRankReferences("explain about the worst candidate", 5)).toEqual(new Set([5]));
    expect(extractRankReferences("tell me about the last one", 5)).toEqual(new Set([5]));
  });
  it("maps 'second highest' to rank 2", () => {
    expect(extractRankReferences("who is second highest?", 8)).toEqual(new Set([2]));
  });
  it("drops out-of-range references", () => {
    expect(extractRankReferences("explain candidate 99", 5)).toEqual(new Set());
  });
  it("returns empty for non-rank questions and empty input", () => {
    expect(extractRankReferences("what is react?", 5)).toEqual(new Set());
    expect(extractRankReferences("", 5)).toEqual(new Set());
    expect(extractRankReferences("anything", 0)).toEqual(new Set());
  });
});

describe("selectChatContext rank integration", () => {
  const mk = (rank, name, text) => ({
    rank,
    fileName: name.toLowerCase().replace(/\s+/g, "_") + ".pdf",
    evaluation: { name, skills: ["react"], strengths: [text], matchedKeywords: [], missingKeywords: [] },
    scores: { total: 100 - rank, skills: 80, experience: 70, education: 60, projects: 50, keywordMatch: 40 },
  });
  const candidates = Array.from({ length: 12 }, (_, i) => mk(i + 1, `Candidate ${i + 1}`, `strength ${i + 1}`));

  it("always includes the referenced rank even when body text matches nothing", () => {
    const corpus = selectChatContext(candidates, "explain about the 10th position candidate");
    expect(corpus).toContain("Candidate 10");
    expect(corpus).toContain("10.");
  });
  it("includes every candidate for top-N questions", () => {
    const corpus = selectChatContext(candidates, "summarize the top 3");
    for (const n of [1, 2, 3]) expect(corpus).toContain(`Candidate ${n}`);
  });
  it("still ranks text-matched candidates when no rank is referenced", () => {
    const corpus = selectChatContext(candidates, "who knows react?");
    expect(corpus).toContain("Candidate 1");
  });
  it("returns empty string for empty candidate list", () => {
    expect(selectChatContext([], "anything")).toBe("");
  });
});
