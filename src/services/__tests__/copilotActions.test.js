import { describe, it, expect } from "vitest";
import {
  parseShortlistActions,
  resolveActionRanks,
  applyShortlistActions,
  buildAuditEntry,
  unshiftAuditEntry,
  applyAuditUndo,
} from "../copilotActions";

const block = (obj) => `Reasoning here...\n<<SHORTLIST_ACTIONS>>\n${obj}\n<<END_ACTIONS>>`;

describe("parseShortlistActions", () => {
  it("passes through answers without an action block", () => {
    const r = parseShortlistActions("Candidate #1 is strongest.");
    expect(r.cleanAnswer).toBe("Candidate #1 is strongest.");
    expect(r.actions).toBeNull();
  });

  it("parses a valid block and strips it from the answer", () => {
    const r = parseShortlistActions(
      block('{"add": [1, 4], "remove": [7], "reason": "Top scores"}')
    );
    expect(r.cleanAnswer).toBe("Reasoning here...");
    expect(r.actions).toEqual({
      add: [1, 4],
      remove: [7],
      statusChanges: [],
      reason: "Top scores",
    });
  });

  it("parses statusChanges and normalizes synonyms", () => {
    const r = parseShortlistActions(
      block(
        '{"statusChanges": [{"rank": 2, "status": "interview"}, {"rank": 3, "status": "Hired"}]}'
      )
    );
    expect(r.actions.statusChanges).toEqual([
      { rank: 2, status: "interviewing" },
      { rank: 3, status: "hired" },
    ]);
  });

  it("drops unsupported statuses like rejected", () => {
    const r = parseShortlistActions(
      block(
        '{"statusChanges": [{"rank": 1, "status": "rejected"}, {"rank": 2, "status": "interviewing"}]}'
      )
    );
    expect(r.actions.statusChanges).toEqual([{ rank: 2, status: "interviewing" }]);
  });

  it("parses a combined shortlist + status block", () => {
    const r = parseShortlistActions(
      block(
        '{"remove": [2], "statusChanges": [{"rank": 1, "status": "hired"}], "reason": "Filled"}'
      )
    );
    expect(r.actions).toEqual({
      add: [],
      remove: [2],
      statusChanges: [{ rank: 1, status: "hired" }],
      reason: "Filled",
    });
  });

  it("tolerates a missing END marker", () => {
    const r = parseShortlistActions(
      'Advice.\n<<SHORTLIST_ACTIONS>>\n{"add": [2]}'
    );
    expect(r.actions).toEqual({ add: [2], remove: [], statusChanges: [], reason: "" });
  });

  it("drops malformed JSON and strips the block", () => {
    const r = parseShortlistActions(block("{not json"));
    expect(r.actions).toBeNull();
    expect(r.cleanAnswer).toBe("Reasoning here...");
  });

  it("filters non-positive ranks, coerces numeric strings, drops empties", () => {
    const r = parseShortlistActions(block('{"add": [0, -2, "3", 1]}'));
    expect(r.actions).toEqual({ add: [3, 1], remove: [], statusChanges: [], reason: "" });

    const empty = parseShortlistActions(block('{"add": [0]}'));
    expect(empty.actions).toBeNull();
  });

  it("ignores a non-string reason", () => {
    const r = parseShortlistActions(block('{"add": [1], "reason": 42}'));
    expect(r.actions.reason).toBe("");
  });

  it("keeps prose that follows a block placed first", () => {
    const r = parseShortlistActions(
      '<<SHORTLIST_ACTIONS>>\n{"add": [1]}\n<<END_ACTIONS>>\nCandidate #1 leads on React depth.'
    );
    expect(r.actions).toEqual({ add: [1], remove: [], statusChanges: [], reason: "" });
    expect(r.cleanAnswer).toBe("Candidate #1 leads on React depth.");
  });

  it("joins prose on both sides of the block", () => {
    const r = parseShortlistActions(
      block('{"add": [2]}') + "\nFollow-up: also worth a screen call."
    );
    expect(r.actions.add).toEqual([2]);
    expect(r.cleanAnswer).toBe(
      "Reasoning here...\n\nFollow-up: also worth a screen call."
    );
  });

  it("parses a block whose JSON is wrapped in code fences", () => {
    const r = parseShortlistActions(
      block('```json\n{"add": [1], "reason": "Best fit"}\n```')
    );
    expect(r.actions).toEqual({ add: [1], remove: [], statusChanges: [], reason: "Best fit" });
    expect(r.cleanAnswer).toBe("Reasoning here...");
  });

  it("falls back to raw text when the whole answer is an unfenced unparseable block", () => {
    const r = parseShortlistActions('<<SHORTLIST_ACTIONS>>\nbroken json');
    expect(r.actions).toBeNull();
    expect(r.cleanAnswer).toBe("broken json");
  });
});

describe("resolveActionRanks", () => {
  const candidates = [
    { id: "a", rank: 1 },
    { id: "b", rank: 2 },
    { id: "c", rank: 3 },
  ];

  it("maps ranks to candidate ids", () => {
    const r = resolveActionRanks({ add: [1, 3], remove: [2] }, candidates);
    expect(r).toEqual({ adds: ["a", "c"], removes: ["b"], statusChanges: [] });
  });

  it("resolves statusChanges to ids with canonical statuses", () => {
    const r = resolveActionRanks(
      { statusChanges: [{ rank: 2, status: "interviewing" }, { rank: 9, status: "hired" }] },
      candidates
    );
    expect(r.statusChanges).toEqual([{ id: "b", status: "interviewing" }]);
  });

  it("drops ranks that do not exist in the session", () => {
    const r = resolveActionRanks({ add: [1, 99] }, candidates);
    expect(r.adds).toEqual(["a"]);
  });

  it("handles a missing candidate list", () => {
    expect(resolveActionRanks({ add: [1] }, null)).toEqual({
      adds: [],
      removes: [],
      statusChanges: [],
    });
  });
});

describe("applyShortlistActions", () => {
  const candidates = [
    { id: "a", rank: 1, shortlisted: false, status: "screened" },
    { id: "b", rank: 2, shortlisted: true, status: "shortlisted" },
    { id: "c", rank: 3, shortlisted: false, status: "interview" },
  ];

  it("adds: shortlisted true, screened becomes shortlisted", () => {
    const [a] = applyShortlistActions(candidates, { adds: ["a"], removes: [] });
    expect(a.shortlisted).toBe(true);
    expect(a.status).toBe("shortlisted");
  });

  it("removes: shortlisted false, shortlisted becomes screened", () => {
    const [b] = applyShortlistActions(candidates, { adds: [], removes: ["b"] });
    expect(b.shortlisted).toBe(false);
    expect(b.status).toBe("screened");
  });

  it("leaves untouched candidates and non-screened statuses alone", () => {
    const out = applyShortlistActions(candidates, { adds: ["a"], removes: [] });
    expect(out[2]).toEqual(candidates[2]); // interview status preserved
  });

  it("remove wins when a candidate appears in both lists", () => {
    const out = applyShortlistActions(candidates, {
      adds: ["a"],
      removes: ["a"],
    });
    expect(out[0].shortlisted).toBe(false);
  });

  it("statusChange moves the stage without touching shortlisted", () => {
    const out = applyShortlistActions(candidates, {
      adds: [],
      removes: [],
      statusChanges: [{ id: "a", status: "interviewing" }],
    });
    expect(out[0].status).toBe("interviewing");
    expect(out[0].shortlisted).toBe(false); // mirrors manual status setter
  });

  it("statusChange to hired keeps shortlisted state as-is", () => {
    const out = applyShortlistActions(candidates, {
      adds: [],
      removes: [],
      statusChanges: [{ id: "a", status: "hired" }],
    });
    expect(out[0].status).toBe("hired");
    expect(out[0].shortlisted).toBe(false);
  });

  it("explicit stage overrides a same-block shortlist add", () => {
    const out = applyShortlistActions(candidates, {
      adds: ["a"],
      removes: [],
      statusChanges: [{ id: "a", status: "interviewing" }],
    });
    expect(out[0].shortlisted).toBe(true);
    expect(out[0].status).toBe("interviewing");
  });

  it("statusChange back to screened after shortlist add wins", () => {
    const out = applyShortlistActions(candidates, {
      adds: ["b"],
      removes: [],
      statusChanges: [{ id: "b", status: "hired" }],
    });
    expect(out[1].shortlisted).toBe(true);
    expect(out[1].status).toBe("hired");
  });
});

describe("copilot audit trail", () => {
  const base = [
    { id: "a", rank: 1, shortlisted: false, status: "screened" },
    { id: "b", rank: 2, shortlisted: true, status: "shortlisted" },
  ];

  it("buildAuditEntry records only changed candidates with before/after", () => {
    const after = applyShortlistActions(base, {
      adds: ["a"],
      removes: [],
      statusChanges: [{ id: "b", status: "interviewing" }],
    });
    const entry = buildAuditEntry({ before: base, after, reason: "Top pick" });
    expect(entry.reason).toBe("Top pick");
    expect(entry.changes).toHaveLength(2);
    const a = entry.changes.find((c) => c.id === "a");
    expect(a.shortlisted).toEqual({ before: false, after: true });
    expect(a.status).toEqual({ before: "screened", after: "shortlisted" });
    expect(a.name).toBe("Candidate"); // no evaluation.name in fixture
    const b = entry.changes.find((c) => c.id === "b");
    expect(b.shortlisted).toBeUndefined();
    expect(b.status).toEqual({ before: "shortlisted", after: "interviewing" });
  });

  it("buildAuditEntry returns null when nothing changed", () => {
    const entry = buildAuditEntry({ before: base, after: base });
    expect(entry).toBeNull();
  });

  it("unshiftAuditEntry prepends and caps the log", () => {
    let s = { candidates: [] };
    for (let i = 0; i < 30; i++) {
      s = unshiftAuditEntry(s, {
        id: `e${i}`,
        appliedAt: "t",
        changes: [{ id: "a", rank: 1, name: "X", shortlisted: { before: false, after: true } }],
      });
    }
    expect(s.copilotAudit).toHaveLength(25);
    expect(s.copilotAudit[0].id).toBe("e29"); // newest first
    expect(s.copilotAudit[24].id).toBe("e5"); // oldest kept after cap
  });

  it("applyAuditUndo restores before state for shortlist + status", () => {
    const after = applyShortlistActions(base, {
      adds: ["a"],
      removes: [],
      statusChanges: [{ id: "b", status: "interviewing" }],
    });
    const entry = buildAuditEntry({ before: base, after });
    const { candidates: undone } = applyAuditUndo(after, entry);
    expect(undone.find((c) => c.id === "a").shortlisted).toBe(false);
    expect(undone.find((c) => c.id === "a").status).toBe("screened");
    expect(undone.find((c) => c.id === "b").status).toBe("shortlisted");
  });

  it("applyAuditUndo is a no-op on already-reverted state (idempotent)", () => {
    const after = applyShortlistActions(base, { adds: ["a"], removes: [] });
    const entry = buildAuditEntry({ before: base, after });
    const { candidates: undone } = applyAuditUndo(after, entry);
    const again = applyAuditUndo(undone, entry);
    expect(again).not.toBeNull();
    expect(again.candidates).toEqual(undone);
    expect(again.candidates).toEqual(base);
  });

  it("applyAuditUndo refuses when the session drifted", () => {
    const after = applyShortlistActions(base, { adds: ["a"], removes: [] });
    const entry = buildAuditEntry({ before: base, after });
    // Someone manually moved 'a' to interviewing after the apply — undo would guess.
    const drifted = after.map((c) => (c.id === "a" ? { ...c, status: "interviewing" } : c));
    expect(applyAuditUndo(drifted, entry)).toBeNull();
    // Candidate removed entirely.
    expect(applyAuditUndo([base[1]], entry)).toBeNull();
  });
});
