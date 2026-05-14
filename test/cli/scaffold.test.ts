import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "../../src/cli";

describe("scaffolding commands", () => {
  it("initializes a coop project", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-init-"));
    try {
      const r = await runCli(["init"], { repoRoot: dir });
      expect(r.exitCode).toBe(0);
      await stat(path.join(dir, ".coop/agents"));
      await stat(path.join(dir, ".coop/environments"));
      await stat(path.join(dir, ".coop/vaults"));
      await stat(path.join(dir, ".coop/memory-stores"));
      await stat(path.join(dir, ".coop/skills"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("creates a starter agent", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-new-agent-"));
    try {
      const r = await runCli(["new", "agent", "daily-digest"], { repoRoot: dir });
      expect(r.exitCode).toBe(0);
      const text = await readFile(path.join(dir, ".coop/agents/daily-digest.md"), "utf8");
      expect(text).toMatch(/name: daily-digest/);
      expect(text).toMatch(/manual: true/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
