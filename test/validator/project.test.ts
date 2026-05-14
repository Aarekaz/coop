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
});
