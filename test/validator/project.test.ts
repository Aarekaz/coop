import { describe, expect, it } from "vitest";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reportProject } from "../../src/validator/project";

async function copyExample(name: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "coop-project-"));
  await cp(path.join(process.cwd(), "examples", name), dir, { recursive: true });
  return dir;
}

describe("reportProject", () => {
  it("validates every coop resource in a project", async () => {
    const dir = await copyExample("morning-sales-digest");
    try {
      const r = await reportProject(dir, { mode: "strict" });
      expect(r.ok).toBe(true);
      expect(r.files.length).toBeGreaterThan(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports invalid resource files with file paths", async () => {
    const dir = await copyExample("morning-sales-digest");
    try {
      const env = path.join(dir, ".coop/environments/shared-node20.yaml");
      await writeFile(env, "baseImage: node:20\nsurprise: true\n");
      const r = await reportProject(dir, { mode: "strict" });
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.path.includes(".coop/environments/shared-node20.yaml"))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("errors when a project has no .coop directory", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-project-empty-"));
    try {
      await mkdir(path.join(dir, "src"));
      const r = await reportProject(dir, { mode: "strict" });
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.code === "project-missing-coop")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports when .coop exists but is not a directory", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-project-invalid-coop-"));
    try {
      await writeFile(path.join(dir, ".coop"), "not a directory");

      const r = await reportProject(dir, { mode: "strict" });

      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.code === "project-invalid-coop")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports project read errors instead of hiding invalid resource directories", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "coop-project-invalid-dir-"));
    try {
      await mkdir(path.join(dir, ".coop"), { recursive: true });
      await writeFile(path.join(dir, ".coop", "agents"), "not a directory");

      const r = await reportProject(dir, { mode: "strict" });

      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.code === "project-read" && e.path.endsWith(".coop/agents"))).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
