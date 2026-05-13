import { readFile } from "node:fs/promises";
import path from "node:path";
import { splitFrontmatter } from "../parser/markdown";
import { parseYaml } from "../parser/yaml";
import { normalizeTriggers } from "../normalizer/triggers";
import { normalizeLegacyAliases } from "../normalizer/legacy";
import { normalizeResources } from "../normalizer/resources";
import { validate, type ValidationIssue, type ValidationMode } from "./index";
import { resolveReferences } from "./refs";
import { collectDiagnostics } from "./diagnostics";
import type { CanonicalAgent } from "../types/canonical";

export interface ReportOptions {
  mode: ValidationMode;
  repoRoot: string;
  homeDir?: string;
}

export interface ReportResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

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

  const data = (parsed.data ?? {}) as Record<string, unknown>;

  let legacyOut;
  try {
    legacyOut = normalizeLegacyAliases(data);
  } catch (e) {
    return { ok: false, errors: [{ code: "legacy-fatal", message: (e as Error).message, path: "/" }], warnings };
  }
  for (const w of legacyOut.warnings) warnings.push({ code: w.code, message: w.message, path: "/" });

  let triggerOut;
  try {
    triggerOut = normalizeTriggers(
      legacyOut.data.triggers as Record<string, unknown> | undefined,
      (legacyOut.data as { trigger?: Record<string, unknown> }).trigger,
    );
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
    resourcesNormalized = normalizeResources(legacyOut.data.resources as unknown[] | undefined);
  } catch (e) {
    return {
      ok: false,
      errors: [{ code: "resources-fatal", message: (e as Error).message, path: "/resources" }],
      warnings,
    };
  }

  const canonical: Record<string, unknown> = { ...legacyOut.data };
  delete (canonical as { trigger?: unknown }).trigger;
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
    const agent = canonical as unknown as CanonicalAgent;
    const diag = collectDiagnostics(agent);
    warnings.push(...diag.warnings);

    const refs = await resolveReferences(agent, { repoRoot: opts.repoRoot, homeDir: opts.homeDir });
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
