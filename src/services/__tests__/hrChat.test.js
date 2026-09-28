import { describe, it, expect } from "vitest";
import { buildChatPrompt } from "../hrChat";

const base = {
  rules: "Looking for a React developer.",
  keywords: ["react", "html"],
  corpus: "1. John — Overall 85/100",
  history: [{ role: "user", content: "Who is best?" }],
  question: "Which candidate is best for the role?",
};

describe("buildChatPrompt", () => {
  it("includes the grounding data (rules, keywords, corpus)", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("Looking for a React developer.");
    expect(prompt).toContain("react, html");
    expect(prompt).toContain("John — Overall 85/100");
  });

  it("instructs the model to refuse only clearly unrelated questions", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("clearly unrelated to hiring");
    expect(prompt).toContain("I can only answer questions about the uploaded resumes");
  });

  it("tells the model rank-referenced candidate blocks are always provided", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("numbered by rank");
    expect(prompt).toContain("the 10th candidate");
  });

  it("includes prior conversation turns", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("User: Who is best?");
  });

  it("includes the current question", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("QUESTION: Which candidate is best for the role?");
  });

  it("handles missing history", () => {
    const prompt = buildChatPrompt({ ...base, history: [] });
    expect(prompt).toContain("QUESTION:");
  });

  it("documents the statusChanges action block and valid stages", () => {
    const prompt = buildChatPrompt(base);
    expect(prompt).toContain("statusChanges");
    expect(prompt).toContain('"interviewing"');
    expect(prompt).toContain("never use it"); // rejected must not be emitted
  });
});
