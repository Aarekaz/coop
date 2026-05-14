import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reportResourceFile } from "../../src/validator/resource-files";

async function withTmp(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "coop-resource-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("reportResourceFile", () => {
  it("accepts a valid environment file", async () => {
    await withTmp(async (dir) => {
      const file = path.join(dir, "shared-node20.yaml");
      await writeFile(file, "baseImage: node:20\npackages:\n  apt: [ffmpeg]\n");
      const r = await reportResourceFile(file, "environment", { mode: "strict" });
      expect(r.ok).toBe(true);
    });
  });

  it("rejects unknown keys in resource files", async () => {
    await withTmp(async (dir) => {
      const file = path.join(dir, "bad.yaml");
      await writeFile(file, "baseImage: node:20\nsurprise: true\n");
      const r = await reportResourceFile(file, "environment", { mode: "strict" });
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.code === "unknown-key")).toBe(true);
    });
  });

  it("accepts vault and memory store files", async () => {
    await withTmp(async (dir) => {
      await mkdir(path.join(dir, ".coop/vaults"), { recursive: true });
      await mkdir(path.join(dir, ".coop/memory-stores"), { recursive: true });
      const vault = path.join(dir, ".coop/vaults/team.yaml");
      const memory = path.join(dir, ".coop/memory-stores/team-memory.yaml");
      await writeFile(vault, "description: Team credentials\nbindings:\n  github: app:github\n");
      await writeFile(memory, "scope: team\nretention: 90d\ndescription: Shared context\n");
      expect((await reportResourceFile(vault, "vault", { mode: "strict" })).ok).toBe(true);
      expect((await reportResourceFile(memory, "memory-store", { mode: "strict" })).ok).toBe(true);
    });
  });
});
