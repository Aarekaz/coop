import type { NormalizerWarning } from "./triggers";

export interface LegacyNormResult {
  data: Record<string, unknown>;
  warnings: NormalizerWarning[];
}

export function normalizeLegacyAliases(input: Record<string, unknown>): LegacyNormResult {
  const warnings: NormalizerWarning[] = [];
  const out: Record<string, unknown> = { ...input };

  if ("attachments" in out) {
    if ("resources" in out) {
      throw new Error("both 'attachments:' and 'resources:' present - remove 'attachments:'");
    }
    out.resources = out.attachments;
    delete out.attachments;
    warnings.push({
      code: "attachments-renamed",
      message: "'attachments:' is a legacy alias for 'resources:'",
    });
  }

  if (out.session === "ambient") {
    out.session = "persistent";
    warnings.push({
      code: "session-ambient-renamed",
      message: "'session: ambient' is renamed to 'session: persistent'; declare 'memory:' for durable knowledge",
    });
  }

  if ("connections" in out && typeof out.connections === "object" && out.connections !== null) {
    const conn = out.connections as Record<string, unknown>;
    const values = Object.values(conn);
    const stringValues = values.filter((v): v is string => typeof v === "string");
    const distinct = [...new Set(stringValues)];

    if (values.length > 0 && values.length === stringValues.length && distinct.length === 1) {
      if (out.vault === undefined) {
        out.vault = distinct[0];
      }
      delete out.connections;
      warnings.push({
        code: "connections-merged-into-vault",
        message:
          "'connections:' collapsed into agent-level 'vault:'; per-server overrides should live in coop.json mcp_servers",
      });
    } else {
      warnings.push({
        code: "connections-manual-migration",
        message:
          distinct.length > 1
            ? `'connections:' has multiple distinct vaults (${distinct.join(", ")}); set 'vault:' to the agent-wide default and move per-server overrides to coop.json mcp_servers, then remove 'connections:'`
            : "'connections:' requires manual migration; set 'vault:' to the agent-wide default and move per-server overrides to coop.json mcp_servers, then remove 'connections:'",
      });
    }
  }

  if (out.workspace === "github_pr") {
    delete out.workspace;
    warnings.push({
      code: "workspace-github-pr-manual-migration",
      message:
        "'workspace: github_pr' scalar shorthand is removed; add 'resources: - github: { repo, branch }' with your repo details",
    });
  }

  return { data: out, warnings };
}
