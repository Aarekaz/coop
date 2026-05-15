import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { reportFile, type ReportResult } from "./report";
import { reportResourceFile, type ResourceFileKind } from "./resource-files";
import type { ValidationIssue, ValidationMode } from "../types/validation";

export interface ProjectReportResult extends ReportResult {
  files: string[];
}

interface FileListResult {
  files: string[];
  errors: ValidationIssue[];
}

export async function reportProject(
  repoRoot: string,
  opts: { mode: ValidationMode; homeDir?: string },
): Promise<ProjectReportResult> {
  const coopDir = path.join(repoRoot, ".coop");
  let coopStat;
  try {
    coopStat = await stat(coopDir);
  } catch (e) {
    return {
      ok: false,
      files: [],
      errors: [
        {
          code: "project-missing-coop",
          message: `No .coop directory found at ${coopDir}: ${errorMessage(e)}`,
          path: coopDir,
        },
      ],
      warnings: [],
    };
  }
  if (!coopStat.isDirectory()) {
    return {
      ok: false,
      files: [],
      errors: [
        {
          code: "project-invalid-coop",
          message: `.coop exists but is not a directory at ${coopDir}`,
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
  errors.push(...agentFiles.errors);
  for (const file of agentFiles.files) {
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
    errors.push(...resourceFiles.errors);
    for (const file of resourceFiles.files) {
      files.push(file);
      const r = await reportResourceFile(file, kind, { mode: opts.mode });
      errors.push(...r.errors);
      warnings.push(...r.warnings);
    }
  }

  return { ok: errors.length === 0, files, errors, warnings };
}

async function listMatching(dir: string, suffix: string): Promise<FileListResult> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    const errors: ValidationIssue[] = [];
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await listMatching(abs, suffix);
        files.push(...nested.files);
        errors.push(...nested.errors);
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        files.push(abs);
      }
    }
    return { files: files.sort(), errors };
  } catch (e) {
    if (isNodeError(e) && e.code === "ENOENT") {
      return { files: [], errors: [] };
    }
    return {
      files: [],
      errors: [
        {
          code: "project-read",
          message: errorMessage(e),
          path: dir,
        },
      ],
    };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function prefixIssues(issues: ValidationIssue[], file: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path.startsWith(file) ? issue.path : `${file}${issue.path}`,
  }));
}
