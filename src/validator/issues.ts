import type { ErrorObject } from "ajv";
import type { ValidationIssue, ValidationMode } from "../types/validation";

const UNKNOWN_KEY_KEYWORD = "additionalProperties";

function schemaIssue(err: ErrorObject, pathPrefix = ""): ValidationIssue {
  const path = err.instancePath || "/";

  if (err.keyword === UNKNOWN_KEY_KEYWORD) {
    return {
      code: "unknown-key",
      message: `Unknown key '${err.params.additionalProperty}' at ${path}`,
      path: `${pathPrefix}${path}`,
    };
  }

  return {
    code: `schema-${err.keyword}`,
    message: err.message ?? "schema violation",
    path: `${pathPrefix}${path}`,
  };
}

export function addSchemaIssue(
  err: ErrorObject,
  mode: ValidationMode,
  buckets: { errors: ValidationIssue[]; warnings: ValidationIssue[] },
  pathPrefix = "",
): void {
  const issue = schemaIssue(err, pathPrefix);
  if (mode === "lenient" && err.keyword === UNKNOWN_KEY_KEYWORD) {
    buckets.warnings.push(issue);
  } else {
    buckets.errors.push(issue);
  }
}
