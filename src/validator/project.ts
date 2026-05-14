import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { reportFile, type ReportResult } from "./report";
import { reportResourceFile, type ResourceFileKind } from "./resource-files";
import type { ValidationIssue, ValidationMode } from "./index";

export interface ProjectReportResult extends ReportResult {
  files: string[];
}

export async function reportProject(
  repoRoot: string,
  opts: { mode: ValidationMode; homeDir?: string },
): Promise<ProjectReportResult> {
  const coopDir = path.join(repoRoot, ".coop");
  try {
    const s = await stat(coopDir);
    if (!s.isDirectory()) throw new Error("not a directory");
  } catch {
    return {
      ok: false,
      files: [],
      errors: [
        {
          code: "project-missing-coop",
          message: `No .coop directory found at ${coopDir}`,
          path: coopDir,
        },
      ],
      warnings: [],
    };
  }

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const files: string[] = [];

  const agentFiles = await listMatching(path.join(coopDir, "agents"), ".md");
  for (const file of agentFiles) {
    files.push(file);
    const r = await reportFile(file, { mode: opts.mode, repoRoot, homeDir: opts.homeDir });
    errors.push(...prefixIssues(r.errors, file));
    warnings.push(...prefixIssues(r.warnings, file));
  }

  const resourceGroups: Array<[string, ResourceFileKind]> = [
    ["environments", "environment"],
    ["vaults", "vault"],
    ["memory-stores", "memory-store"],
  ];
  for (const [dirName, kind] of resourceGroups) {
    const resourceFiles = await listMatching(path.join(coopDir, dirName), ".yaml");
    for (const file of resourceFiles) {
      files.push(file);
      const r = await reportResourceFile(file, kind, { mode: opts.mode });
      errors.push(...r.errors);
      warnings.push(...r.warnings);
    }
  }

  return { ok: errors.length === 0, files, errors, warnings };
}

async function listMatching(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await listMatching(abs, suffix)));
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        files.push(abs);
      }
    }
    return files.sort();
  } catch {
    return [];
  }
}

function prefixIssues(issues: ValidationIssue[], file: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path.startsWith(file) ? issue.path : `${file}${issue.path}`,
  }));
}
