import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import { parseYaml } from "../parser/yaml";
import environmentSchema from "../schema/environment.schema.json" with { type: "json" };
import vaultSchema from "../schema/vault.schema.json" with { type: "json" };
import memoryStoreSchema from "../schema/memory-store.schema.json" with { type: "json" };
import type { ValidationIssue, ValidationMode, ValidationResultShape } from "../types/validation";
import { addSchemaIssue } from "./issues";

export type ResourceFileKind = "environment" | "vault" | "memory-store";

export interface ResourceFileResult extends ValidationResultShape {}

const ajv = new Ajv({ strict: true, allErrors: true });
const validators = {
  environment: ajv.compile(environmentSchema),
  vault: ajv.compile(vaultSchema),
  "memory-store": ajv.compile(memoryStoreSchema),
};

export async function reportResourceFile(
  file: string,
  kind: ResourceFileKind,
  opts: { mode: ValidationMode },
): Promise<ResourceFileResult> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [{ code: "file-read", message, path: file }], warnings: [] };
  }

  const parsed = parseYaml(text);
  const errors: ValidationIssue[] = parsed.errors.map((e) => ({
    code: "yaml-syntax",
    message: e.message,
    path: `${file}:${e.line}:${e.col}`,
  }));
  const warnings: ValidationIssue[] = [];
  if (errors.length) return { ok: false, errors, warnings };

  const validate = validators[kind];
  const ok = validate(parsed.data ?? {});
  if (!ok) {
    for (const err of validate.errors ?? []) {
      addSchemaIssue(err, opts.mode, { errors, warnings }, file);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
