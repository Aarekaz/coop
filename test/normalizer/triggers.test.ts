import { describe, it, expect } from "vitest";
import { normalizeTriggers } from "../../src/normalizer/triggers";

describe("normalizeTriggers", () => {
  it("returns undefined when no triggers field present", () => {
    expect(normalizeTriggers(undefined, undefined)).toEqual({ triggers: undefined, warnings: [] });
  });

  it("expands scalar cron shortcut", () => {
    const out = normalizeTriggers({ cron: "0 9 * * 1-5" }, undefined);
    expect(out.triggers).toEqual([{ type: "cron", schedule: "0 9 * * 1-5" }]);
  });

  it("preserves object form for cron with tz", () => {
    const out = normalizeTriggers({ cron: { schedule: "0 9 * * 1-5", tz: "America/New_York" } }, undefined);
    expect(out.triggers).toEqual([
      { type: "cron", schedule: "0 9 * * 1-5", tz: "America/New_York" },
    ]);
  });

  it("expands manual: true scalar", () => {
    const out = normalizeTriggers({ manual: true }, undefined);
    expect(out.triggers).toEqual([{ type: "manual" }]);
  });

  it("handles multi-instance cron via array", () => {
    const out = normalizeTriggers({ cron: ["0 9 * * 1-5", "0 12 * * 6"] }, undefined);
    expect(out.triggers).toEqual([
      { type: "cron", schedule: "0 9 * * 1-5" },
      { type: "cron", schedule: "0 12 * * 6" },
    ]);
  });

  it("accepts singular trigger: form and warns", () => {
    const out = normalizeTriggers(undefined, { cron: "0 9 * * 1-5" });
    expect(out.triggers).toEqual([{ type: "cron", schedule: "0 9 * * 1-5" }]);
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "trigger-singular-alias" }));
  });

  it("preserves provider-namespaced trigger types", () => {
    const out = normalizeTriggers({ "linear.on_issue": { team: "ENG", label: "customer" } }, undefined);
    expect(out.triggers).toEqual([
      { type: "linear.on_issue", team: "ENG", label: "customer" },
    ]);
  });

  it("merges multiple trigger types", () => {
    const out = normalizeTriggers({ cron: "0 9 * * 1-5", manual: true }, undefined);
    expect(out.triggers).toHaveLength(2);
    expect(out.triggers).toContainEqual({ type: "cron", schedule: "0 9 * * 1-5" });
    expect(out.triggers).toContainEqual({ type: "manual" });
  });

  it("rejects both triggers: and singular trigger: present", () => {
    expect(() => normalizeTriggers({ cron: "0 9 * * *" }, { cron: "0 10 * * *" })).toThrow(/both/);
  });
});
