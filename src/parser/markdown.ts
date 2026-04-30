export interface SplitResult {
  frontmatter: string;
  body: string;
}

const DELIM = "---";

export function splitFrontmatter(content: string): SplitResult {
  // No frontmatter at all
  if (!content.startsWith(DELIM)) {
    return { frontmatter: "", body: content };
  }

  // Skip opening delimiter line
  const afterOpen = content.indexOf("\n");
  if (afterOpen === -1) {
    throw new Error("Frontmatter opening delimiter has no closing delimiter");
  }

  // Find closing --- on its own line
  const remainder = content.slice(afterOpen + 1);
  const closeMatch = remainder.match(/\n---[ \t]*(?:\n|$)/);
  if (!closeMatch || closeMatch.index === undefined) {
    throw new Error("Frontmatter has no closing delimiter (---)");
  }

  const frontmatter = remainder.slice(0, closeMatch.index + 1);
  const body = remainder.slice(closeMatch.index + closeMatch[0].length);
  return { frontmatter, body };
}
