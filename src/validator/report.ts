import { readFile } from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "../parser/markdown";
import { parseYaml } from "../parser/yaml";
import { normalizeTriggers } from "../normalizer/triggers";
import { normalizeLegacyAliases } from "../normalizer/legacy";
import { normalizeResources } from "../normalizer/resources";
import { validate } from "./index";
import { resolveReferences } from "./refs";
import { collectDiagnostics } from "./diagnostics";
import type { HookValue, Hooks, Outcome } from "../types/canonical";
import type { ValidationIssue, ValidationMode, ValidationResultShape } from "../types/validation";

export interface ReportOptions {
  mode: ValidationMode;
  repoRoot: string;
  homeDir?: string;
}

export interface ReportResult extends ValidationResultShape {}

export async function reportFile(file: string, opts: ReportOptions): Promise<ReportResult> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [{ code: "file-read", message, path: file }],
      warnings: [],
    };
  }
  return reportText(text, file, opts);
}

export async function reportText(text: string, file: string, opts: ReportOptions): Promise<ReportResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  let frontmatter: string;
  try {
    ({ frontmatter } = splitFrontmatter(text));
  } catch (e) {
    return {
      ok: false,
      errors: [{ code: "markdown-frontmatter", message: (e as Error).message, path: "/" }],
      warnings,
    };
  }

  const parsed = parseYaml(frontmatter);
  for (const ye of parsed.errors) {
    errors.push({ code: "yaml-syntax", message: ye.message, path: `:${ye.line}:${ye.col}` });
  }
  if (errors.length) return { ok: false, errors, warnings };

  const data = asObjectRecord(parsed.data ?? {});

  let legacyOut;
  try {
    legacyOut = normalizeLegacyAliases(data);
  } catch (e) {
    return { ok: false, errors: [{ code: "legacy-fatal", message: (e as Error).message, path: "/" }], warnings };
  }
  for (const w of legacyOut.warnings) warnings.push({ code: w.code, message: w.message, path: "/" });

  let triggerOut;
  try {
    triggerOut = normalizeTriggers(legacyOut.data.triggers, legacyOut.data.trigger);
  } catch (e) {
    return {
      ok: false,
      errors: [{ code: "triggers-fatal", message: (e as Error).message, path: "/triggers" }],
      warnings,
    };
  }
  for (const w of triggerOut.warnings) warnings.push({ code: w.code, message: w.message, path: "/triggers" });

  let resourcesNormalized;
  try {
    resourcesNormalized = normalizeResources(asOptionalArray(legacyOut.data.resources));
  } catch (e) {
    return {
      ok: false,
      errors: [{ code: "resources-fatal", message: (e as Error).message, path: "/resources" }],
      warnings,
    };
  }

  const canonical: Record<string, unknown> = { ...legacyOut.data };
  delete canonical.trigger;
  if (triggerOut.triggers !== undefined) {
    canonical.triggers = triggerOut.triggers;
  } else {
    delete canonical.triggers;
  }
  if (resourcesNormalized !== undefined) {
    canonical.resources = resourcesNormalized;
  } else {
    delete canonical.resources;
  }

  const filenameBase = path.basename(file).replace(/\.md$/, "");
  if (typeof canonical.name === "string" && canonical.name !== filenameBase) {
    errors.push({
      code: "name-filename-mismatch",
      message: `'name: ${canonical.name}' does not match filename '${filenameBase}'`,
      path: "/name",
    });
  }

  const schemaResult = validate(canonical, { mode: opts.mode });
  errors.push(...schemaResult.errors);
  warnings.push(...schemaResult.warnings);

  if (errors.length === 0) {
    const diag = collectDiagnostics({
      hooks: asHooks(canonical.hooks),
      outcome: asOutcome(canonical.outcome),
    });
    warnings.push(...diag.warnings);

    const refs = await resolveReferences(
      {
        environment: asStringReference(canonical.environment),
        vault: asStringReference(canonical.vault),
        memory: asStringReference(canonical.memory),
        skills: asStringArray(canonical.skills),
      },
      { repoRoot: opts.repoRoot, homeDir: opts.homeDir },
    );
    errors.push(...refs.errors);
    for (const m of refs.missing) {
      errors.push({
        code: "ref-not-found",
        message: `${m.field} reference '${m.name}' did not resolve`,
        path: `/${m.field}`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function asObjectRecord(value: unknown): Record<string, unknown> {
  return isObjectRecord(value) ? value : {};
}

function asOptionalArray(value: unknown): unknown[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  throw new Error("'resources:' must be an array");
}

function asOutcome(value: unknown): Outcome | undefined {
  if (isObjectRecord(value) && typeof value.description === "string") {
    return {
      description: value.description,
      max_iterations: typeof value.max_iterations === "number" ? value.max_iterations : undefined,
    };
  }
  return undefined;
}

function asHooks(value: unknown): Hooks | undefined {
  if (!isObjectRecord(value)) return undefined;

  const hooks: Hooks = {};
  for (const [event, hookValue] of Object.entries(value)) {
    if (isHookValue(hookValue)) {
      hooks[event] = hookValue;
    }
  }
  return hooks;
}

function asStringReference(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string") ? value : undefined;
}

function isHookValue(value: unknown): value is HookValue {
  if (typeof value === "string") return true;
  if (!isObjectRecord(value)) return false;
  if (value.replace === true && Array.isArray(value.handlers)) {
    return value.handlers.every(isHookValue);
  }
  return (
    typeof value.url === "string" &&
    (value.headers === undefined || (isObjectRecord(value.headers) && Object.values(value.headers).every(isString)))
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
