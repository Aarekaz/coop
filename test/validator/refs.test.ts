import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveReferences } from "../../src/validator/refs";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "coop-refs-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

async function touch(rel: string) {
  const abs = path.join(tmp, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, "");
}

describe("resolveReferences", () => {
  it("returns no missing when all refs resolve", async () => {
    await touch(".coop/environments/shared-node20.yaml");
    await touch(".coop/vaults/sales-team.yaml");
    await touch(".coop/memory-stores/sales-team-memory.yaml");
    await touch(".coop/skills/sales-scoring/SKILL.md");

    const result = await resolveReferences(
      {
        environment: "shared-node20",
        vault: "sales-team",
        memory: "sales-team-memory",
        skills: ["sales-scoring"],
      },
      { repoRoot: tmp, homeDir: "/nonexistent" },
    );
    expect(result.missing).toEqual([]);
  });

  it("reports each missing ref by field and name", async () => {
    const result = await resolveReferences(
      { environment: "nope-env", skills: ["nope-skill"] },
      { repoRoot: tmp, homeDir: "/nonexistent" },
    );
    expect(result.errors).toEqual([]);
    expect(result.missing).toContainEqual({ field: "environment", name: "nope-env" });
    expect(result.missing).toContainEqual({ field: "skills", name: "nope-skill" });
  });

  it("skills falls back to .claude/skills if .coop/skills missing", async () => {
    await touch(".claude/skills/foo/SKILL.md");
    const result = await resolveReferences({ skills: ["foo"] }, { repoRoot: tmp, homeDir: "/nonexistent" });
    expect(result.missing).toEqual([]);
  });

  it("inline (object) values are not resolved", async () => {
    const result = await resolveReferences(
      { environment: { packages: { apt: ["ffmpeg"] } } },
      { repoRoot: tmp, homeDir: "/nonexistent" },
    );
    expect(result.missing).toEqual([]);
  });

  it("reports reference read errors instead of treating them as missing", async () => {
    await writeFile(path.join(tmp, ".coop"), "not a directory");

    const result = await resolveReferences({ environment: "shared-node20" }, { repoRoot: tmp });

    expect(result.missing).toEqual([]);
    expect(result.errors).toContainEqual(expect.objectContaining({ code: "ref-read" }));
  });
});
