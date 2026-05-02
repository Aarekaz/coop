import { describe, it, expect } from "vitest";
import { parseYaml } from "../../src/parser/yaml";

describe("parseYaml", () => {
  it("parses valid YAML to a JS object", () => {
    const result = parseYaml("name: foo\nmodel: claude-sonnet-4-6\n");
    expect(result.data).toEqual({ name: "foo", model: "claude-sonnet-4-6" });
    expect(result.errors).toEqual([]);
  });

  it("returns source position for a given key path", () => {
    const yaml = `name: foo
triggers:
  cron: "0 9 * * 1-5"
`;
    const result = parseYaml(yaml);
    const pos = result.positionOf(["triggers", "cron"]);
    expect(pos).not.toBeNull();
    expect(pos!.line).toBe(3);
    expect(pos!.col).toBeGreaterThan(0);
  });

  it("collects YAML syntax errors instead of throwing", () => {
    const result = parseYaml("name: [unterminated\n");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toHaveProperty("message");
    expect(result.errors[0]).toHaveProperty("line");
  });

  it("returns null position for an unknown path", () => {
    const result = parseYaml("name: foo\n");
    expect(result.positionOf(["nonexistent"])).toBeNull();
  });
});
