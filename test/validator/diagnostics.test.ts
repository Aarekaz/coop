import { describe, it, expect } from "vitest";
import { collectDiagnostics } from "../../src/validator/diagnostics";

describe("collectDiagnostics", () => {
  it("flags preview-feature when outcome is present", () => {
    const out = collectDiagnostics({ name: "x", model: "m", outcome: { description: "d" } });
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "preview-outcome" }));
  });

  it("does not flag preview-feature when outcome absent", () => {
    const out = collectDiagnostics({ name: "x", model: "m" });
    expect(out.warnings.filter((w) => w.code === "preview-outcome")).toEqual([]);
  });

  it("flags named-hook string handlers", () => {
    const out = collectDiagnostics({
      name: "x",
      model: "m",
      hooks: { on_run_end: "named-hook" } as never,
    });
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "hooks-named-refs-not-in-slice1" }));
  });

  it("does not flag local-path hook handlers", () => {
    const out = collectDiagnostics({
      name: "x",
      model: "m",
      hooks: { on_run_end: "./hooks/x.sh" },
    });
    expect(out.warnings.filter((w) => w.code === "hooks-named-refs-not-in-slice1")).toEqual([]);
  });
});
