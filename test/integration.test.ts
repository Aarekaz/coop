import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reportFile } from "../src/validator/report";

let tmp: string;

beforeAll(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "coop-int-"));
  await mkdir(path.join(tmp, ".coop/environments"), { recursive: true });
  await mkdir(path.join(tmp, ".coop/vaults"), { recursive: true });
  await mkdir(path.join(tmp, ".coop/memory-stores"), { recursive: true });
  await mkdir(path.join(tmp, ".coop/skills/sales-scoring"), { recursive: true });
  await mkdir(path.join(tmp, ".coop/agents"), { recursive: true });

  await writeFile(path.join(tmp, ".coop/environments/shared-node20.yaml"), "");
  await writeFile(path.join(tmp, ".coop/vaults/sales-team.yaml"), "");
  await writeFile(path.join(tmp, ".coop/memory-stores/sales-team-memory.yaml"), "");
  await writeFile(path.join(tmp, ".coop/skills/sales-scoring/SKILL.md"), "");

  const fixtures = [
    "canonical-example.md",
    "legacy-trigger-singular.md",
    "legacy-attachments.md",
    "legacy-session-ambient.md",
    "preview-outcome.md",
    "invalid-name-filename.md",
    "invalid-unknown-key.md",
    "invalid-named-hook.md",
  ];
  for (const f of fixtures) {
    await cp(path.join("test/fixtures", f), path.join(tmp, ".coop/agents", f));
  }
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

function agentPath(name: string) {
  return path.join(tmp, ".coop/agents", name);
}

describe("integration: pipeline on fixtures", () => {
  it("canonical-example passes strict with no errors", async () => {
    const r = await reportFile(agentPath("canonical-example.md"), { mode: "strict", repoRoot: tmp });
    if (!r.ok) console.error(r.errors);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "preview-outcome")).toBe(true);
  });

  it("legacy-trigger-singular warns and passes", async () => {
    const r = await reportFile(agentPath("legacy-trigger-singular.md"), { mode: "lenient", repoRoot: tmp });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "trigger-singular-alias")).toBe(true);
  });

  it("legacy-attachments warns and passes", async () => {
    const r = await reportFile(agentPath("legacy-attachments.md"), { mode: "lenient", repoRoot: tmp });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "attachments-renamed")).toBe(true);
  });

  it("legacy-session-ambient warns and passes", async () => {
    const r = await reportFile(agentPath("legacy-session-ambient.md"), { mode: "lenient", repoRoot: tmp });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === "session-ambient-renamed")).toBe(true);
  });

  it("preview-outcome warns in both modes", async () => {
    const strict = await reportFile(agentPath("preview-outcome.md"), { mode: "strict", repoRoot: tmp });
    const lenient = await reportFile(agentPath("preview-outcome.md"), { mode: "lenient", repoRoot: tmp });
    expect(strict.ok).toBe(true);
    expect(lenient.ok).toBe(true);
    expect(strict.warnings.some((w) => w.code === "preview-outcome")).toBe(true);
    expect(lenient.warnings.some((w) => w.code === "preview-outcome")).toBe(true);
  });

  it("invalid-name-filename errors", async () => {
    const r = await reportFile(agentPath("invalid-name-filename.md"), { mode: "strict", repoRoot: tmp });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === "name-filename-mismatch")).toBe(true);
  });

  it("invalid-unknown-key errors in strict, warns in lenient", async () => {
    const strict = await reportFile(agentPath("invalid-unknown-key.md"), { mode: "strict", repoRoot: tmp });
    const lenient = await reportFile(agentPath("invalid-unknown-key.md"), { mode: "lenient", repoRoot: tmp });
    expect(strict.ok).toBe(false);
    expect(strict.errors.some((e) => e.code === "unknown-key")).toBe(true);
    expect(lenient.ok).toBe(true);
    expect(lenient.warnings.some((w) => w.code === "unknown-key")).toBe(true);
  });

  it("invalid-named-hook errors in strict (schema pattern)", async () => {
    const r = await reportFile(agentPath("invalid-named-hook.md"), { mode: "strict", repoRoot: tmp });
    expect(r.ok).toBe(false);
  });
});
