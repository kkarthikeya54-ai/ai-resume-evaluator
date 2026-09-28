import { describe, it, expect } from "vitest";
import { STAGES, colIdFor } from "../KanbanBoard";

describe("kanban stage grouping", () => {
  it("exposes the four pipeline stages in order", () => {
    expect(STAGES.map((s) => s.id)).toEqual(["screened", "shortlisted", "interviewing", "hired"]);
  });

  it("maps every known status to its stage id", () => {
    expect(colIdFor({ status: "screened" })).toBe("screened");
    expect(colIdFor({ status: "shortlisted" })).toBe("shortlisted");
    expect(colIdFor({ status: "interviewing" })).toBe("interviewing");
    expect(colIdFor({ status: "hired" })).toBe("hired");
  });

  it("falls back to the first stage for missing or unknown status", () => {
    expect(colIdFor({})).toBe("screened");
    expect(colIdFor({ status: undefined })).toBe("screened");
    expect(colIdFor({ status: "nonsense" })).toBe("screened");
  });
});
