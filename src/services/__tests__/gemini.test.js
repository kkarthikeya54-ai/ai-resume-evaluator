import { describe, it, expect } from "vitest";
import { parseJsonResponse } from "../gemini";

describe("parseJsonResponse", () => {
  it("parses a plain JSON object", () => {
    expect(parseJsonResponse('{"score": 80}')).toEqual({ score: 80 });
  });

  it("parses JSON wrapped in a code fence", () => {
    expect(parseJsonResponse('```json\n{"summary": "hi"}\n```')).toEqual({ summary: "hi" });
  });

  it("parses JSON wrapped in a plain fence", () => {
    expect(parseJsonResponse('```\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("recovers JSON embedded in extra text", () => {
    expect(parseJsonResponse('Here you go: {"a": 1} hope that helps')).toEqual({ a: 1 });
  });

  it("throws when no JSON is present", () => {
    expect(() => parseJsonResponse("no json here")).toThrow();
  });
});
