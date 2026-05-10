import Ajv, { type ErrorObject } from "ajv";
import schema from "../schema/agent.schema.json" with { type: "json" };
import type { CanonicalAgent } from "../types/canonical";

export type ValidationMode = "strict" | "lenient";

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const ajv = new Ajv({ strict: true, allErrors: true });
const ajvValidate = ajv.compile(schema);

const UNKNOWN_KEY_KEYWORDS = new Set(["additionalProperties"]);

export function validate(input: unknown, opts: { mode: ValidationMode }): ValidationResult {
  const ok = ajvValidate(input);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!ok) {
    for (const err of ajvValidate.errors ?? []) {
      const issue = toIssue(err);
      if (opts.mode === "lenient" && UNKNOWN_KEY_KEYWORDS.has(err.keyword)) {
        warnings.push(issue);
      } else {
        errors.push(issue);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function toIssue(err: ErrorObject): ValidationIssue {
  if (err.keyword === "additionalProperties") {
    return {
      code: "unknown-key",
      message: `Unknown key '${err.params.additionalProperty}' at ${err.instancePath || "/"}`,
      path: err.instancePath || "/",
    };
  }
  return {
    code: `schema-${err.keyword}`,
    message: err.message ?? "schema violation",
    path: err.instancePath || "/",
  };
}

export type { CanonicalAgent };
