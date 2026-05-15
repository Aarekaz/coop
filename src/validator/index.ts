import Ajv from "ajv";
import schema from "../schema/agent.schema.json" with { type: "json" };
import type { ValidationIssue, ValidationMode, ValidationResultShape } from "../types/validation";
import { addSchemaIssue } from "./issues";

export interface ValidationResult extends ValidationResultShape {}

const ajv = new Ajv({ strict: true, allErrors: true });
const ajvValidate = ajv.compile(schema);

export function validate(input: unknown, opts: { mode: ValidationMode }): ValidationResult {
  const ok = ajvValidate(input);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!ok) {
    for (const err of ajvValidate.errors ?? []) {
      addSchemaIssue(err, opts.mode, { errors, warnings });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export type { ValidationIssue, ValidationMode };
