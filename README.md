# coop — Agent File Format

Reference implementation of the Coop `.coop/agents/<name>.md` file format.

**Spec:** [docs/superpowers/specs/2026-05-13-coop-yaml-agent-format-design.md](docs/superpowers/specs/2026-05-13-coop-yaml-agent-format-design.md)

## What this is

A pipeline that reads `.coop/agents/<name>.md`, normalizes legacy aliases
and polymorphic shortcuts, and validates the canonical form against a closed
JSON Schema. Ships as a library and a minimal `coop validate` CLI.

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
