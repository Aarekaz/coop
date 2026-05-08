import { describe, it, expect } from "vitest";
import { normalizeResources } from "../../src/normalizer/resources";

describe("normalizeResources", () => {
  it("returns undefined when no resources field", () => {
    expect(normalizeResources(undefined)).toBeUndefined();
  });

  it("expands file: scalar shorthand to canonical {type, path}", () => {
    const out = normalizeResources([{ file: "./a.csv" }]);
    expect(out).toEqual([{ type: "file", path: "./a.csv" }]);
  });

  it("expands file: object shorthand preserving mount", () => {
    const out = normalizeResources([{ file: { path: "./a.sql", mount: "/db/a.sql" } }]);
    expect(out).toEqual([{ type: "file", path: "./a.sql", mount: "/db/a.sql" }]);
  });

  it("expands github: object shorthand", () => {
    const out = normalizeResources([
      { github: { repo: "acme/x", branch: "main", mount: "/playbooks" } },
    ]);
    expect(out).toEqual([
      { type: "github", repo: "acme/x", branch: "main", mount: "/playbooks" },
    ]);
  });

  it("preserves already-canonical entries unchanged", () => {
    const input = [{ type: "file", path: "./a.csv" }];
    expect(normalizeResources(input)).toEqual(input);
  });

  it("rejects an entry that is neither shorthand nor canonical", () => {
    expect(() => normalizeResources([{ unknown_key: "x" } as unknown])).toThrow(/resource/);
  });

  it("rejects an entry that mixes shorthand keys", () => {
    expect(() => normalizeResources([{ file: "./a", github: { repo: "x/y" } }])).toThrow(/multiple/);
  });
});
