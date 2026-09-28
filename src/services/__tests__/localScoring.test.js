import { describe, it, expect } from "vitest";
import {
  localEvaluate,
  detectSkills,
  detectYearsExperience,
  detectDegree,
  matchKeywords,
  guessNameFromFileName,
} from "../localScoring";

const RESUME = `
Asha Verma
Email: asha.verma@example.com | Phone: +91 98765 43210
B.Tech Computer Science, 2024, VTU

Skills: JavaScript, TypeScript, React, Node.js, HTML, CSS, Git, SQL

Experience:
Software Engineering Intern at TechNova (2023 - 2024). Built REST APIs and fixed bugs.
Projects:
- E-commerce site with cart and payments (github.com/asha/shop)
- Chat app using React and Firebase
- Portfolio website

Led a 4-member team for the capstone project.
`;

describe("localScoring detectors", () => {
  it("detects skills as whole phrases", () => {
    const skills = detectSkills(RESUME);
    expect(skills).toContain("javascript");
    expect(skills).toContain("react");
    expect(skills).toContain("node.js");
    expect(skills).not.toContain("java"); // "javascript" must not match "java"
  });

  it("parses years of experience from ranges and claims", () => {
    expect(detectYearsExperience("Worked 3 years at X")).toBe(3);
    expect(detectYearsExperience("Intern (2021 - 2023)")).toBe(2);
    expect(detectYearsExperience("no dates here")).toBe(0);
  });

  it("detects degree level", () => {
    expect(detectDegree(RESUME).label).toBe("Bachelor's");
    expect(detectDegree("M.Tech in AI").label).toBe("Master's");
    expect(detectDegree("high school")).toBeNull();
  });

  it("matches keywords case-insensitively with hits and misses", () => {
    const { matched, missing } = matchKeywords(RESUME, ["React", "python", "SQL"]);
    expect(matched.sort()).toEqual(["react", "sql"]);
    expect(missing).toEqual(["python"]);
  });

  it("derives a human name from the file name", () => {
    expect(guessNameFromFileName("resume_001_Bhavana_Singh.pdf")).toBe("Bhavana Singh");
    expect(guessNameFromFileName("Rohan_Choudhary.pdf")).toBe("Rohan Choudhary");
    expect(guessNameFromFileName("resume.pdf")).toBe("");
  });
});

describe("localEvaluate", () => {
  it("produces the full evaluation shape for a strong resume", () => {
    const evaluation = localEvaluate({
      resumeText: RESUME,
      fileName: "resume_001_Asha_Verma.pdf",
      keywords: ["javascript", "react", "sql", "python"],
      rules: "Junior engineer with React",
    });
    expect(evaluation.local).toBe(true);
    expect(evaluation.email).toBe("asha.verma@example.com");
    expect(evaluation.skills.length).toBeGreaterThan(4);
    expect(evaluation.ratings.keywordMatch).toBe(75);
    expect(evaluation.ratings.skills).toBeGreaterThan(30);
    expect(evaluation.ratings.experience).toBeGreaterThan(20);
    expect(evaluation.strengths.length).toBeGreaterThan(2);
    expect(evaluation.concerns.some((c) => c.includes("python"))).toBe(true);
  });

  it("produces low but valid scores for an empty resume", () => {
    const evaluation = localEvaluate({ resumeText: "", fileName: "x.pdf", keywords: [] });
    expect(evaluation.ratings.skills).toBe(0);
    expect(evaluation.ratings.education).toBeLessThanOrEqual(20);
    expect(evaluation.ratings.overall).toBeGreaterThanOrEqual(0);
    expect(evaluation.ratings.overall).toBeLessThanOrEqual(100);
  });

  it("is deterministic", () => {
    const a = localEvaluate({ resumeText: RESUME, fileName: "a.pdf", keywords: ["react"] });
    const b = localEvaluate({ resumeText: RESUME, fileName: "a.pdf", keywords: ["react"] });
    expect(a.ratings).toEqual(b.ratings);
  });
});
