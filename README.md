# Coop

Coop is a vendor-independent agent file format for managed agents.

It gives teams a Git-native way to define agents, triggers, tools, skills,
runtime resources, credentials, memory, hooks, and validation rules without
locking the source of truth to one hosted agent platform.

**Spec:** [docs/specs/agent-file-format.md](docs/specs/agent-file-format.md)

## What this is

This repository is Slice 1 of Coop: the portable configuration layer.

It ships:

- A Markdown + YAML format for `.coop/agents/<name>.md`
- A closed JSON Schema for canonical agent definitions
- Normalizers for humane shortcuts and legacy aliases
- Reference checks for environments, vaults, memory stores, and skills
- A minimal `coop validate` CLI

It does not yet execute agents. The runtime, trigger workers, scheduler,
hosted dashboard, and sandbox integration are later slices.

## Example

```markdown
---
apiVersion: coop.dev/v1
name: morning-sales-digest
title: Morning sales digest

triggers:
  cron: "0 8 * * 1-5"
  manual: true

model: claude-sonnet-4-6
session: isolated

tools: [bash, read, salesforce.search_leads, slack.send_message]
skills: [sales-scoring]

environment: shared-node20
vault: sales-team
memory: sales-team-memory
---

# Morning sales digest

Summarize new Salesforce leads every weekday morning and post the digest to
the sales channel.
```

More examples live in [examples](examples).

## Install

```bash
bun install
```

## CLI

```bash
bun run bin/coop validate path/to/agent.md
bun run bin/coop validate path/to/agent.md --mode=lenient
bun run bin/coop --help
```

Exit codes: `0` ok, `1` validation failed, `2` usage error.

## Library

```ts
import { reportFile } from "./src/validator/report";
const result = await reportFile("./.coop/agents/foo.md", {
  mode: "strict",
  repoRoot: process.cwd(),
});
if (!result.ok) console.error(result.errors);
```

## Test

```bash
bun test
bun run typecheck
```

## Pipeline

```
read markdown → split frontmatter → parse yaml → normalize legacy aliases →
  normalize triggers → validate canonical (AJV) → resolve refs → collect diagnostics
```

## Out of scope for Slice 1

`coop new agent`, agent runtime, web dashboard, `.coop/hooks/<name>/HOOK.md`,
multi-agent coordinator, full Outcome rubric. See spec §18 for the full
deferred list.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

MIT
