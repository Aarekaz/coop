import type { Resource } from "../types/canonical";

const SHORTHAND_KEYS = ["file", "github"] as const;
type ShorthandKey = (typeof SHORTHAND_KEYS)[number];

export function normalizeResources(input: unknown[] | undefined): Resource[] | undefined {
  if (input === undefined) return undefined;
  return input.map((raw, idx) => expandOne(raw, idx));
}

function expandOne(raw: unknown, idx: number): Resource {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`resources[${idx}] must be an object, got ${typeof raw}`);
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.type === "string") {
    return obj as unknown as Resource;
  }

  const present = SHORTHAND_KEYS.filter((k) => k in obj);
  if (present.length === 0) {
    throw new Error(
      `resources[${idx}] is not a valid resource shorthand - expected one of: ${SHORTHAND_KEYS.join(", ")}`,
    );
  }
  if (present.length > 1) {
    throw new Error(`resources[${idx}] has multiple shorthand keys (${present.join(", ")}); use exactly one`);
  }

  const key = present[0]!;
  const value = obj[key];
  return expand(key, value, idx);
}

function expand(key: ShorthandKey, value: unknown, idx: number): Resource {
  if (key === "file") {
    if (typeof value === "string") {
      return { type: "file", path: value };
    }
    if (typeof value === "object" && value !== null && "path" in value) {
      return { type: "file", ...(value as { path: string; mount?: string }) };
    }
    throw new Error(`resources[${idx}].file must be a string or {path, mount?} object`);
  }

  if (typeof value === "object" && value !== null && "repo" in value) {
    return {
      type: "github",
      ...(value as {
        repo: string;
        branch?: string;
        commit?: string;
        mount?: string;
        authorization_token?: string;
      }),
    };
  }
  throw new Error(`resources[${idx}].github must be an object with at least 'repo'`);
}
