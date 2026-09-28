import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveCandidates, loadCandidates, clearCandidates } from "../hrStore";
import { generateCandidatesCsv } from "../hrScoring";

function mockSessionStorage(store = {}) {
  globalThis.sessionStorage = {
    getItem: vi.fn((k) => (k in store ? store[k] : null)),
    setItem: vi.fn((k, v) => {
      store[k] = String(v);
    }),
    removeItem: vi.fn((k) => {
      delete store[k];
    }),
  };
}

const sampleCandidates = [
  {
    id: "c1",
    fileName: "A.pdf",
    evaluation: { name: 'Alice "A" Doe' },
    scores: { total: 85, skills: 90, experience: 80, education: 70, projects: 75, keywordMatch: 88 },
    rank: 1,
    shortlisted: true,
  },
  {
    id: "c2",
    fileName: "B.pdf",
    evaluation: { name: "Bob" },
    scores: { total: 62, skills: 60, experience: 55, education: 50, projects: 60, keywordMatch: 58 },
    rank: 2,
    shortlisted: false,
  },
];

describe("candidate shortlisting persistence (hrStore)", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  it("persists and reloads the shortlist across a reload round-trip", () => {
    saveCandidates(sampleCandidates);
    const stored = loadCandidates();
    expect(stored).toHaveLength(2);
    expect(stored[0].shortlisted).toBe(true);
    expect(stored[1].shortlisted).toBe(false);
  });

  it("round-trips toggling a candidate onto and off the shortlist", () => {
    saveCandidates(sampleCandidates);
    const toggle = (id) => {
      const next = loadCandidates().map((c) =>
        c.id === id ? { ...c, shortlisted: !c.shortlisted } : c
      );
      saveCandidates(next);
    };

    toggle("c2");
    let stored = loadCandidates();
    expect(stored.find((c) => c.id === "c2").shortlisted).toBe(true);

    toggle("c2");
    stored = loadCandidates();
    expect(stored.find((c) => c.id === "c2").shortlisted).toBe(false);
  });

  it("clears the persisted candidates", () => {
    saveCandidates(sampleCandidates);
    expect(loadCandidates()).toHaveLength(2);
    clearCandidates();
    expect(loadCandidates()).toEqual([]);
  });

  it("returns an empty array when nothing is stored or JSON is corrupt", () => {
    expect(loadCandidates()).toEqual([]);
    mockSessionStorage({ airesume_hr_candidates: "{not json" });
    expect(loadCandidates()).toEqual([]);
  });
});

describe("candidate CSV generation", () => {
  it("emits a header row followed by one row per candidate", () => {
    const csv = generateCandidatesCsv(sampleCandidates);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Rank");
    expect(lines[0]).toContain("Candidate Name");
    expect(lines[0]).toContain("Shortlisted");
    expect(lines).toHaveLength(3);
  });

  it("writes scores as percentages and shortlisted as Yes/No", () => {
    const csv = generateCandidatesCsv([sampleCandidates[0]]);
    expect(csv).toContain("85%");
    expect(csv).toContain("Yes");
  });

  it("escapes double quotes inside candidate names", () => {
    const csv = generateCandidatesCsv([sampleCandidates[0]]);
    expect(csv).toContain('"Alice ""A"" Doe"');
  });

  it("tolerates empty or missing candidate arrays", () => {
    expect(generateCandidatesCsv([]).split("\n")).toHaveLength(1);
    expect(generateCandidatesCsv(undefined).split("\n")).toHaveLength(1);
  });
});
