import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCli } from "../../src/cli";

let tmp: string;
let goodFile: string;
let badFile: string;

beforeAll(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "coop-cli-"));
  await mkdir(path.join(tmp, ".coop/agents"), { recursive: true });
  goodFile = path.join(tmp, ".coop/agents/ok.md");
  badFile = path.join(tmp, ".coop/agents/bad.md");
  await writeFile(
    goodFile,
    `---
name: ok
model: claude-sonnet-4-6
triggers: { manual: true }
---
`,
  );
  await writeFile(
    badFile,
    `---
name: not-bad
model: m
---
`,
  );
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("runCli", () => {
  it("exit 0 on a valid file", async () => {
    const r = await runCli(["validate", goodFile, "--mode=strict"], { repoRoot: tmp });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/ok/i);
  });

  it("exit 1 and prints errors on invalid file", async () => {
    const r = await runCli(["validate", badFile, "--mode=strict"], { repoRoot: tmp });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/name-filename-mismatch|name.*filename/);
  });

  it("exit 2 on missing argument", async () => {
    const r = await runCli(["validate"], { repoRoot: tmp });
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toMatch(/usage/i);
  });

  it("exit 1 with a structured error when the file is missing", async () => {
    const r = await runCli(["validate", path.join(tmp, ".coop/agents/missing.md")], { repoRoot: tmp });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/error: \[file-read\]/);
  });
});
