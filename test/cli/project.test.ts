import { describe, expect, it } from "vitest";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "../../src/cli";

describe("coop validate .", () => {
  it("validates a project directory", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-cli-project-"));
    try {
      await cp(path.join(process.cwd(), "examples/morning-sales-digest"), dir, { recursive: true });
      const r = await runCli(["validate", "."], { repoRoot: dir });
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toMatch(/ok:/);
      expect(r.stdout).toMatch(/files/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
