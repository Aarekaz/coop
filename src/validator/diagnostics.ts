import type { CanonicalAgent } from "../types/canonical";
import type { ValidationIssue } from "./index";

export interface DiagnosticsResult {
  warnings: ValidationIssue[];
}

export function collectDiagnostics(agent: CanonicalAgent): DiagnosticsResult {
  const warnings: ValidationIssue[] = [];

  if (agent.outcome !== undefined) {
    warnings.push({
      code: "preview-outcome",
      message: "'outcome:' is a preview feature - shape may change in v2",
      path: "/outcome",
    });
  }

  if (agent.hooks) {
    for (const [event, value] of Object.entries(agent.hooks)) {
      if (typeof value === "string" && !/^[./]/.test(value)) {
        warnings.push({
          code: "hooks-named-refs-not-in-slice1",
          message: `Named hook reference '${value}' is reserved syntax; Slice 1 hook strings MUST start with ./ or /`,
          path: `/hooks/${event}`,
        });
      }
    }
  }

  return { warnings };
}
