export type ValidationMode = "strict" | "lenient";

export interface ValidationIssue {
  code: string;
  message: string;
  path: string;
}

export interface ValidationResultShape {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
