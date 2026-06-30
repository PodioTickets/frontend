import { describe, it, expect } from "vitest";
import { shortId, formatShortId } from "@/utils/shortId";

describe("shortId", () => {
  it("reduz o UUID ao 1º segmento (8 chars antes do 1º '-')", () => {
    expect(shortId("999ef0df-a1a3-4e10-95eb-7b2b8df6f0c7")).toBe("999ef0df");
    expect(formatShortId("999ef0df-a1a3-4e10-95eb-7b2b8df6f0c7")).toBe("#999ef0df");
  });

  it("trata vazio/nulo sem quebrar", () => {
    expect(shortId(undefined)).toBe("");
    expect(shortId(null)).toBe("");
    expect(shortId("")).toBe("");
    expect(formatShortId(null)).toBe("");
  });

  it("é idempotente p/ id já curto (sem '-')", () => {
    expect(shortId("999ef0df")).toBe("999ef0df");
    expect(formatShortId("999ef0df")).toBe("#999ef0df");
  });
});
