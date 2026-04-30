import { describe, it, expect } from "vitest";
import { splitFrontmatter } from "../../src/parser/markdown";

describe("splitFrontmatter", () => {
  it("splits frontmatter and body when both present", () => {
    const input = `---
name: foo
model: claude-sonnet-4-6
---

# Foo
Hello world.
`;
    const result = splitFrontmatter(input);
    expect(result.frontmatter).toBe("name: foo\nmodel: claude-sonnet-4-6\n");
    expect(result.body.trim()).toBe("# Foo\nHello world.");
  });

  it("returns empty frontmatter when no --- delimiters", () => {
    const input = "# Just a body\n";
    const result = splitFrontmatter(input);
    expect(result.frontmatter).toBe("");
    expect(result.body).toBe("# Just a body\n");
  });

  it("rejects content where the closing --- is missing", () => {
    const input = `---
name: foo
no closing delimiter here`;
    expect(() => splitFrontmatter(input)).toThrow(/closing/);
  });

  it("preserves leading blank lines inside body", () => {
    const input = `---
name: foo
---


body starts after two blank lines
`;
    const result = splitFrontmatter(input);
    expect(result.body.startsWith("\n\nbody")).toBe(true);
  });
});
