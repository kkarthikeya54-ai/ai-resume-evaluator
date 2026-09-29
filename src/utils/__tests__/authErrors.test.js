import { describe, it, expect } from "vitest";
import { getAuthErrorMessage, getGoogleAuthErrorMessage } from "../authErrors";

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

describe("getGoogleAuthErrorMessage", () => {
  it("returns a clean message when the user cancels the popup", () => {
    const msg = getGoogleAuthErrorMessage({ code: "auth/popup-closed-by-user" });
    expect(msg).toBe("Google sign-in was cancelled.");
    expect(msg).not.toContain("shield");
  });

  it("returns the known message for non-privacy codes", () => {
    const msg = getGoogleAuthErrorMessage({ code: "auth/operation-not-allowed" });
    expect(msg).toBe("This sign-in method is not enabled.");
    expect(msg).not.toContain("shield");
  });

  it("explains the browser-privacy workaround for unknown codes (partitioned storage failures)", () => {
    const msg = getGoogleAuthErrorMessage({ code: "" });
    expect(msg).toContain("cross-site cookies");
    expect(msg).toContain("ad blocker");
    expect(msg).toContain("Enhanced Tracking Protection");
    expect(msg).toContain("shield icon");
    expect(msg).toContain("Email & Password");
  });
});
