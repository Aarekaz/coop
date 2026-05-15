# Coop

Coop is a vendor-independent agent file format for managed agents.

It gives teams a Git-native way to define agents, triggers, tools, skills,
runtime resources, credentials, memory, hooks, and validation rules without
locking the source of truth to one hosted agent platform.

**Spec:** [docs/specs/agent-file-format.md](docs/specs/agent-file-format.md)

## What this is

This repository is Slice 1 and the core of Slice 2 of Coop: the portable
configuration and project-validation layer.

It ships:

- A Markdown + YAML format for `.coop/agents/<name>.md`
- A closed JSON Schema for canonical agent definitions
- Normalizers for humane shortcuts and legacy aliases
- Reference checks for environments, vaults, memory stores, and skills
- Schemas for `.coop/environments`, `.coop/vaults`, and `.coop/memory-stores`
- A minimal CLI for `coop validate`, `coop init`, and `coop new agent`

It does not yet execute agents. Runtime execution, trigger workers, scheduler,
hosted dashboard, and sandbox integration are planned for later slices.

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
bun run bin/coop validate path/to/project
bun run bin/coop validate path/to/agent.md --mode=lenient
bun run bin/coop init
bun run bin/coop new agent daily-digest
bun run bin/coop --help
```

Exit codes: `0` ok, `1` validation failed, `2` usage error.

## Library

```ts
import { reportFile } from "./src/validator/report";
import { reportProject } from "./src/validator/project";

const result = await reportFile("./.coop/agents/foo.md", {
  mode: "strict",
  repoRoot: process.cwd(),
});
if (!result.ok) console.error(result.errors);

const project = await reportProject(".", { mode: "strict" });
if (!project.ok) console.error(project.errors);
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

For project validation, Coop also walks `.coop/agents`, `.coop/environments`,
`.coop/vaults`, and `.coop/memory-stores`, then reports one combined diagnostic
result.

## Out of scope

Agent runtime, web dashboard, `.coop/hooks/<name>/HOOK.md`, multi-agent
coordinator, full Outcome rubric, and Anthropic import/export mapping. See
[ROADMAP.md](ROADMAP.md) for planned slices.

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## License

MIT
