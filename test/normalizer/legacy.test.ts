import { describe, it, expect } from "vitest";
import { normalizeLegacyAliases } from "../../src/normalizer/legacy";

describe("normalizeLegacyAliases", () => {
  it("renames attachments to resources and warns", () => {
    const input = { attachments: [{ file: "./a.csv" }] };
    const out = normalizeLegacyAliases(input);
    expect(out.data.resources).toEqual([{ file: "./a.csv" }]);
    expect(out.data.attachments).toBeUndefined();
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "attachments-renamed" }));
  });

  it("errors when both attachments and resources are present", () => {
    const input = { attachments: [{ file: "./a" }], resources: [{ file: "./b" }] };
    expect(() => normalizeLegacyAliases(input)).toThrow(/both/);
  });

  it("rewrites session: ambient to persistent with warning", () => {
    const input = { session: "ambient" };
    const out = normalizeLegacyAliases(input);
    expect(out.data.session).toBe("persistent");
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "session-ambient-renamed" }));
  });

  it("merges single-entry connections: into vault: when vault unset", () => {
    const input = { connections: { salesforce: "sales-team" } };
    const out = normalizeLegacyAliases(input);
    expect(out.data.vault).toBe("sales-team");
    expect(out.data.connections).toBeUndefined();
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "connections-merged-into-vault" }));
  });

  it("merges connections: when all entries share the same value", () => {
    const input = { connections: { salesforce: "shared", gmail: "shared" } };
    const out = normalizeLegacyAliases(input);
    expect(out.data.vault).toBe("shared");
    expect(out.data.connections).toBeUndefined();
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "connections-merged-into-vault" }));
  });

  it("preserves connections: with conflict warning when distinct vaults", () => {
    const input = { connections: { salesforce: "sales-team", gmail: "marketing-team" } };
    const out = normalizeLegacyAliases(input);
    expect(out.data.connections).toEqual({ salesforce: "sales-team", gmail: "marketing-team" });
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "connections-manual-migration" }));
  });

  it("does not overwrite an explicit vault: when merging connections:", () => {
    const input = { vault: "explicit", connections: { salesforce: "from-conn" } };
    const out = normalizeLegacyAliases(input);
    expect(out.data.vault).toBe("explicit");
    expect(out.data.connections).toBeUndefined();
    expect(out.warnings).toContainEqual(expect.objectContaining({ code: "connections-merged-into-vault" }));
  });

  it("drops workspace: github_pr scalar with manual-migration warning", () => {
    const input = { workspace: "github_pr" };
    const out = normalizeLegacyAliases(input);
    expect(out.data.workspace).toBeUndefined();
    expect(out.warnings).toContainEqual(
      expect.objectContaining({ code: "workspace-github-pr-manual-migration" }),
    );
  });

  it("passes through unrelated keys unchanged", () => {
    const input = { name: "foo", model: "claude-sonnet-4-6" };
    const out = normalizeLegacyAliases(input);
    expect(out.data).toEqual(input);
    expect(out.warnings).toEqual([]);
  });
});
