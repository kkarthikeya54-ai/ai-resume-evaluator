import { describe, it, expect } from "vitest";
import { getAuthErrorMessage } from "../authErrors";

describe("getAuthErrorMessage", () => {
  it("returns a friendly message for known codes", () => {
    expect(getAuthErrorMessage("auth/invalid-credential")).toContain("Invalid email or password");
    expect(getAuthErrorMessage("auth/email-already-in-use")).toContain("already exists");
  });

  it("falls back for unknown codes", () => {
    expect(getAuthErrorMessage("auth/unknown-thing")).toBe("Something went wrong. Please try again.");
  });

  it("supports a custom fallback", () => {
    expect(getAuthErrorMessage("auth/unknown-thing", "Custom.")).toBe("Custom.");
  });
});
