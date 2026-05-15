import { describe, expect, it } from "vitest";
import type { ReportResult, ValidationIssue, ValidationMode, ValidationResult } from "../../src";

describe("public type exports", () => {
  it("exposes shared validation result types from the package root", () => {
    const issue = {
      code: "example",
      message: "Example issue",
      path: "/",
    } satisfies ValidationIssue;

    const mode = "strict" satisfies ValidationMode;

    const validationResult = {
      ok: false,
      errors: [issue],
      warnings: [],
    } satisfies ValidationResult;

    const reportResult = validationResult satisfies ReportResult;

    expect(mode).toBe("strict");
    expect(reportResult.errors[0]?.code).toBe("example");
  });
});
