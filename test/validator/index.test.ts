import { describe, it, expect } from "vitest";
import { validate } from "../../src/validator";

describe("validate", () => {
  const goodAgent = {
    name: "foo",
    model: "claude-sonnet-4-6",
  };

  it("strict accepts a valid canonical agent", () => {
    const r = validate(goodAgent, { mode: "strict" });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("strict rejects unknown top-level key", () => {
    const r = validate({ ...goodAgent, surprise: 1 }, { mode: "strict" });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("lenient warns on unknown top-level key but is ok", () => {
    const r = validate({ ...goodAgent, surprise: 1 }, { mode: "lenient" });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "unknown-key")).toBe(true);
  });

  it("invalid value (e.g. malformed timeout) is an error in both modes", () => {
    const bad = { ...goodAgent, timeout: "five minutes" };
    const strict = validate(bad, { mode: "strict" });
    const lenient = validate(bad, { mode: "lenient" });
    expect(strict.ok).toBe(false);
    expect(lenient.ok).toBe(false);
  });
});
