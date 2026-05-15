import { stat } from "node:fs/promises";
import path from "node:path";
import type { CanonicalAgent } from "../types/canonical";
import type { ValidationIssue } from "../types/validation";

interface RefMissing {
  field: "environment" | "vault" | "memory" | "skills";
  name: string;
}

export interface RefResolveOptions {
  repoRoot: string;
  homeDir?: string;
}

export interface RefResolveResult {
  missing: RefMissing[];
  errors: ValidationIssue[];
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch (e) {
    if (isNodeError(e) && e.code === "ENOENT") {
      return false;
    }
    throw new Error(`Could not check reference path ${p}: ${errorMessage(e)}`);
  }
}

async function checkSimple(
  kind: "environments" | "vaults" | "memory-stores",
  name: string,
  opts: RefResolveOptions,
): Promise<boolean> {
  return exists(path.join(opts.repoRoot, ".coop", kind, `${name}.yaml`));
}

async function checkSkill(name: string, opts: RefResolveOptions): Promise<boolean> {
  const candidates = [
    path.join(opts.repoRoot, ".coop/skills", name, "SKILL.md"),
    path.join(opts.repoRoot, ".claude/skills", name, "SKILL.md"),
    ...(opts.homeDir ? [path.join(opts.homeDir, ".claude/skills", name, "SKILL.md")] : []),
    path.join(opts.repoRoot, "vendor/skills", name, "SKILL.md"),
  ];
  for (const c of candidates) {
    if (await exists(c)) return true;
  }
  return false;
}

export async function resolveReferences(
  agent: Pick<CanonicalAgent, "environment" | "vault" | "memory" | "skills">,
  opts: RefResolveOptions,
): Promise<RefResolveResult> {
  const missing: RefMissing[] = [];
  const errors: ValidationIssue[] = [];

  try {
    if (typeof agent.environment === "string" && !(await checkSimple("environments", agent.environment, opts))) {
      missing.push({ field: "environment", name: agent.environment });
    }
    if (typeof agent.vault === "string" && !(await checkSimple("vaults", agent.vault, opts))) {
      missing.push({ field: "vault", name: agent.vault });
    }
    if (typeof agent.memory === "string" && !(await checkSimple("memory-stores", agent.memory, opts))) {
      missing.push({ field: "memory", name: agent.memory });
    }
    for (const skill of agent.skills ?? []) {
      if (!(await checkSkill(skill, opts))) {
        missing.push({ field: "skills", name: skill });
      }
    }
  } catch (e) {
    errors.push({ code: "ref-read", message: errorMessage(e), path: "/" });
  }

  return { missing, errors };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
