import { describe, it, expect } from "vitest";
import {
  applyPassRate,
  clampPassRate,
  clearExemptions,
  countBelow,
  scoreOf,
} from "../passRate";

const cand = (id, total, extra = {}) => ({
  id,
  scores: { total, overall: total },
  status: extra.status || "screened",
  ...extra,
});

describe("clampPassRate", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clampPassRate(-5)).toBe(0);
    expect(clampPassRate(150)).toBe(100);
    expect(clampPassRate(49.6)).toBe(50);
    expect(clampPassRate("70")).toBe(70);
    expect(clampPassRate(undefined)).toBe(0);
  });
});

describe("scoreOf", () => {
  it("prefers total then overall", () => {
    expect(scoreOf({ scores: { total: 80, overall: 60 } })).toBe(80);
    expect(scoreOf({ scores: { overall: 60 } })).toBe(60);
    expect(scoreOf({})).toBe(0);
  });
});

describe("countBelow", () => {
  it("counts candidates strictly below the threshold", () => {
    const list = [cand("a", 80), cand("b", 60), cand("c", 45)];
    expect(countBelow(list, 61)).toBe(2);
    expect(countBelow(list, 60)).toBe(1);
    expect(countBelow(list, 45)).toBe(0); // strict <
    expect(countBelow(list, 0)).toBe(0);
  });
});

describe("applyPassRate", () => {
  const list = () => [
    cand("a", 85),
    cand("b", 60),
    cand("c", 40),
  ];

  it("moves candidates below the threshold to rejected, keeping history", () => {
    const { candidates, rejected, restored } = applyPassRate(list(), 61);
    expect(rejected).toBe(2);
    expect(restored).toBe(0);
    const b = candidates.find((c) => c.id === "b");
    const c = candidates.find((c) => c.id === "c");
    expect(b.status).toBe("rejected");
    expect(b.rejectedFrom).toBe("screened");
    expect(c.status).toBe("rejected");
    expect(candidates.find((x) => x.id === "a").status).toBe("screened");
  });

  it("does not double-mark already rejected candidates", () => {
    const once = applyPassRate(list(), 70).candidates;
    const twice = applyPassRate(once, 70);
    expect(twice.rejected).toBe(0);
    expect(twice.candidates.find((c) => c.id === "b").rejectedFrom).toBe("screened");
  });

  it("restores auto-rejected candidates when threshold is lowered to clear them", () => {
    const first = applyPassRate(list(), 70);
    // 60 no longer below 50 → restored; 40 still below.
    const second = applyPassRate(first.candidates, 50);
    expect(second.restored).toBe(1);
    expect(second.rejected).toBe(0);
    const b = second.candidates.find((c) => c.id === "b");
    expect(b.status).toBe("screened");
    expect(b.rejectedFrom).toBeUndefined();
    const c = second.candidates.find((c) => c.id === "c");
    expect(c.status).toBe("rejected");
  });

  it("threshold 0 disables auto-rejection and restores all auto-rejected", () => {
    const first = applyPassRate(list(), 80);
    const second = applyPassRate(first.candidates, 0);
    expect(second.restored).toBe(2);
    second.candidates.forEach((c) => {
      expect(c.status).not.toBe("rejected");
      expect(c.rejectedFrom).toBeUndefined();
    });
  });

  it("never touches manually rejected candidates (no rejectedFrom marker)", () => {
    const manual = [cand("m", 90, { status: "rejected" })];
    const { candidates, rejected, restored } = applyPassRate(manual, 95);
    expect(rejected).toBe(0);
    expect(restored).toBe(0);
    expect(candidates[0].status).toBe("rejected");
  });

  it("keeps shortlisted flag untouched when rejecting", () => {
    const withShort = [cand("s", 30, { shortlisted: true })];
    const { candidates } = applyPassRate(withShort, 50);
    expect(candidates[0].status).toBe("rejected");
    expect(candidates[0].shortlisted).toBe(true);
  });

  it("handles missing/empty input", () => {
    expect(applyPassRate(undefined, 50).candidates).toEqual([]);
    expect(applyPassRate([], 50).rejected).toBe(0);
  });
});

describe("passRateExempt (manual rescue)", () => {
  const list = () => [cand("a", 85), cand("b", 60), cand("c", 40)];

  it("never auto-rejects an exempt candidate, even below the threshold", () => {
    const list = [cand("a", 85), cand("b", 60, { passRateExempt: true }), cand("c", 40)];
    const { candidates, rejected } = applyPassRate(list, 70);
    expect(rejected).toBe(1); // only c — b was rescued by hand
    const b = candidates.find((x) => x.id === "b");
    expect(b.status).toBe("screened");
    expect(b.passRateExempt).toBe(true); // marker is not consumed
    expect(candidates.find((x) => x.id === "c").status).toBe("rejected");
  });

  it("a rescued candidate stays out across repeated applies (reload path)", () => {
    // 1. threshold applied → b + c auto-rejected with history
    const first = applyPassRate(list(), 70).candidates;
    // 2. recruiter hits Restore on b (score 60 < rate 70 → exempt marker)
    const rescued = first.map((c) => {
      if (c.id !== "b") return c;
      const back = { ...c, status: c.rejectedFrom || "screened", passRateExempt: true };
      delete back.rejectedFrom;
      return back;
    });
    // 3. reload re-applies the stored threshold — b must not come back
    const second = applyPassRate(rescued, 70);
    const b = second.candidates.find((x) => x.id === "b");
    expect(b.status).toBe("screened");
    expect(second.candidates.find((x) => x.id === "c").status).toBe("rejected");
  });

  it("countBelow skips rescued candidates", () => {
    const list = [cand("a", 80), cand("b", 60, { passRateExempt: true }), cand("c", 45)];
    expect(countBelow(list, 70)).toBe(1); // only c would be rejected
    expect(countBelow(list, 55)).toBe(1);
  });
});

describe("clearExemptions", () => {
  it("drops every rescue, so the next application re-rejects", () => {
    const rescued = [cand("b", 60, { passRateExempt: true }), cand("c", 40)];
    const cleared = clearExemptions(rescued);
    expect(cleared[0].passRateExempt).toBeUndefined();
    expect(rescued[0].passRateExempt).toBe(true); // input untouched
    const { candidates, rejected } = applyPassRate(cleared, 70);
    expect(rejected).toBe(2);
    expect(candidates.every((c) => c.status === "rejected")).toBe(true);
  });

  it("returns the input array untouched when nothing is exempt", () => {
    const list = [cand("a", 80)];
    expect(clearExemptions(list)).toBe(list);
  });

  it("handles missing/empty input", () => {
    expect(clearExemptions(undefined)).toEqual([]);
    expect(clearExemptions([])).toEqual([]);
  });
});
