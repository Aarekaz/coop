import { describe, it, expect } from "vitest";
import { reportFile } from "../../src/validator/report";
import path from "node:path";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("reportFile", () => {
  it("reports ok on the canonical example", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-report-"));
    await mkdir(path.join(dir, ".coop/agents"), { recursive: true });
    const file = path.join(dir, ".coop/agents/morning-sales-digest.md");
    await writeFile(
      file,
      `---
apiVersion: coop.dev/v1
name: morning-sales-digest
model: claude-sonnet-4-6
triggers:
  manual: true
---

# body
`,
    );
    const result = await reportFile(file, { mode: "strict", repoRoot: dir });
    if (!result.ok) console.error(result.errors);
    expect(result.ok).toBe(true);
  });

  it("reports filename != name as an error", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-report-"));
    await mkdir(path.join(dir, ".coop/agents"), { recursive: true });
    const file = path.join(dir, ".coop/agents/foo.md");
    await writeFile(
      file,
      `---
name: not-foo
model: m
---
`,
    );
    const result = await reportFile(file, { mode: "strict", repoRoot: dir });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "name-filename-mismatch")).toBe(true);
  });
});
