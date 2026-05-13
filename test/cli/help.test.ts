import { describe, it, expect } from "vitest";
import { runCli } from "../../src/cli";

describe("coop --help", () => {
  it("prints usage and exits 0 with --help", async () => {
    const r = await runCli(["--help"], { repoRoot: process.cwd() });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/Usage:.*coop/);
  });

  it("prints usage and exits 0 with no args", async () => {
    const r = await runCli([], { repoRoot: process.cwd() });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/Usage:/);
  });
});
