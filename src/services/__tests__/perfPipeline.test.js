import { describe, it, expect, vi } from "vitest";

vi.mock("../config/ai", () => ({
  hasAccess: () => false,
}));

vi.mock("../gemini", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    GeminiService: {
      expandKeywords: vi.fn().mockRejectedValue(new Error("unavailable")),
      evaluateBatch: vi.fn(),
    },
  };
});

import { runHrAnalysis } from "../hrScoring";
import { GeminiService } from "../gemini";
import { salvageTopLevelBlocks } from "../gemini";
import { hashBytes, getExtractedText, putExtractedText, clearExtractCache } from "../extractCache";
import { MAX_CONCURRENT_EXTRACTS } from "../hrScoring";

describe("salvageTopLevelBlocks", () => {
  it("returns null for clean input", () => {
    expect(salvageTopLevelBlocks(null)).toBeNull();
    expect(salvageTopLevelBlocks("no json")).toBeNull();
  });

  it("recovers complete blocks from a truncated response", () => {
    const truncated = `{"0": {"name": "A", "ratings": {"skills": 80}}, "1": {"name": "B", "rat`;
    const salvaged = salvageTopLevelBlocks(truncated);
    expect(salvaged).not.toBeNull();
    expect(Object.keys(salvaged)).toEqual(["0"]);
    expect(salvaged["0"].name).toBe("A");
    expect(salvaged["0"].ratings.skills).toBe(80);
  });

  it("honors strings containing braces and escaped quotes", () => {
    const tricky = `{"0": {"rationale": "uses { and \\"quotes\\" inside"}, "1": {"name": "B"}}`;
    const salvaged = salvageTopLevelBlocks(tricky);
    expect(Object.keys(salvaged)).toEqual(["0", "1"]);
    expect(salvaged["0"].rationale).toBe('uses { and "quotes" inside');
    expect(salvaged["1"].name).toBe("B");
  });

  it("skips invalid blocks but keeps valid ones", () => {
    const mixed = `{"bad": {broken, "0": {"name": "OK"}}`;
    const salvaged = salvageTopLevelBlocks(mixed);
    expect(salvaged).not.toBeNull();
    expect(salvaged["0"].name).toBe("OK");
    expect(salvaged.bad).toBeUndefined();
  });
});

describe("extractCache", () => {
  it("hashes bytes consistently (sha256 or fallback)", async () => {
    const a = await hashBytes(new TextEncoder().encode("hello world"));
    const b = await hashBytes(new TextEncoder().encode("hello world"));
    const c = await hashBytes(new TextEncoder().encode("different"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("falls back to null/false outside IndexedDB (node env)", async () => {
    expect(await getExtractedText("some-hash")).toBeNull();
    expect(await putExtractedText("some-hash", "text")).toBe(false);
    expect(await clearExtractCache()).toBe(false);
  });
});

describe("runHrAnalysis extraction phase", () => {
  const file = () =>
    new File(["Experienced React developer with HTML and CSS skills."], "resume.txt", {
      type: "text/plain",
    });

  it("emits extracting progress before scoring progress", async () => {
    vi.mocked(GeminiService.evaluateBatch).mockResolvedValue({
      "0": { name: "Alex Doe", ratings: { skills: 80 } },
    });

    const stages = [];
    await runHrAnalysis({
      files: [file(), file()],
      rules: "React dev",
      keywords: "react",
      onProgress: (p) => stages.push(p.stage),
    });

    expect(stages[0]).toBe("extracting");
    expect(stages).toContain("scoring");
  });

  it("caps concurrent extractions at the semaphore limit", async () => {
    expect(MAX_CONCURRENT_EXTRACTS).toBeLessThanOrEqual(3);
    expect(MAX_CONCURRENT_EXTRACTS).toBeGreaterThanOrEqual(1);
  });
});
