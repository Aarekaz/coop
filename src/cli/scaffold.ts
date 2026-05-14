import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function initProject(repoRoot: string): Promise<void> {
  const dirs = [
    ".coop/agents",
    ".coop/environments",
    ".coop/vaults",
    ".coop/memory-stores",
    ".coop/skills",
    ".coop/programs",
  ];
  for (const dir of dirs) {
    await mkdir(path.join(repoRoot, dir), { recursive: true });
  }
}

export async function newAgent(repoRoot: string, name: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error("agent name must be kebab-case: /^[a-z0-9-]+$/");
  }
  await initProject(repoRoot);
  const file = path.join(repoRoot, ".coop/agents", `${name}.md`);
  const text = `---
apiVersion: coop.dev/v1
name: ${name}
model: claude-sonnet-4-6
triggers:
  manual: true
session: isolated
---

# ${name}

Describe what this agent should do.
`;
  await writeFile(file, text, { flag: "wx" });
  return file;
}
