import type { FileResource, GithubResource, Resource } from "../types/canonical";

const SHORTHAND_KEYS = ["file", "github"] as const;
type ShorthandKey = (typeof SHORTHAND_KEYS)[number];
type FileResourceConfig = Pick<FileResource, "path" | "mount">;
type GithubResourceConfig = Pick<GithubResource, "repo" | "branch" | "commit" | "mount" | "authorization_token">;
type UnknownRecord = Record<string, unknown>;

export function normalizeResources(input: unknown[] | undefined): Resource[] | undefined {
  if (input === undefined) return undefined;
  return input.map((raw, idx) => expandOne(raw, idx));
}

function expandOne(raw: unknown, idx: number): Resource {
  if (!isUnknownRecord(raw)) {
    throw new Error(`resources[${idx}] must be an object, got ${typeof raw}`);
  }

  if ("type" in raw) {
    if (isResource(raw)) {
      return raw;
    }
    throw new Error(`resources[${idx}] is not a valid canonical resource`);
  }

  const present = SHORTHAND_KEYS.filter((k) => k in raw);
  if (present.length === 0) {
    throw new Error(
      `resources[${idx}] is not a valid resource shorthand - expected one of: ${SHORTHAND_KEYS.join(", ")}`,
    );
  }
  if (present.length > 1) {
    throw new Error(`resources[${idx}] has multiple shorthand keys (${present.join(", ")}); use exactly one`);
  }

  const key = present[0]!;
  const value = raw[key];
  return key === "file" ? expandFile(value, idx) : expandGithub(value, idx);
}

function expandFile(value: unknown, idx: number): FileResource {
  if (typeof value === "string") {
    return { type: "file", path: value };
  }
  if (isFileResourceConfig(value)) {
    return { type: "file", ...value };
  }
  throw new Error(`resources[${idx}].file must be a string or {path, mount?} object`);
}

function expandGithub(value: unknown, idx: number): GithubResource {
  if (isGithubResourceConfig(value)) {
    return { type: "github", ...value };
  }
  throw new Error(`resources[${idx}].github must be an object with at least 'repo'`);
}

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResource(value: unknown): value is Resource {
  if (!isUnknownRecord(value)) return false;
  if (value.type === "file") {
    return isFileResourceConfig(value);
  }
  if (value.type === "github") {
    return isGithubResourceConfig(value);
  }
  return false;
}

function isFileResourceConfig(value: unknown): value is FileResourceConfig {
  return (
    isUnknownRecord(value) &&
    typeof value.path === "string" &&
    (value.mount === undefined || typeof value.mount === "string")
  );
}

function isGithubResourceConfig(value: unknown): value is GithubResourceConfig {
  return (
    isUnknownRecord(value) &&
    typeof value.repo === "string" &&
    (value.branch === undefined || typeof value.branch === "string") &&
    (value.commit === undefined || typeof value.commit === "string") &&
    (value.mount === undefined || typeof value.mount === "string") &&
    (value.authorization_token === undefined || typeof value.authorization_token === "string")
  );
}
