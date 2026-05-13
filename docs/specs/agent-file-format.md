# Coop Agent File Format — Design Spec (Slice 1)

**Status:** Draft for review
**Date:** 2026-05-13
**Scope:** Slice 1 — `.coop/agents/<name>.md` per-agent definition file, plus interface stubs for the files it references
**Keywords:** The keywords MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, MAY, and OPTIONAL in this document are to be interpreted as described in RFC 2119.

---

## 1. Goal & Non-Goals

**Goal.** Define the source-of-truth schema for `.coop/agents/<name>.md`, the per-agent definition file in a Coop project. The schema MUST be enforceable by a closed-schema validator (`coop validate`) and MUST translate losslessly to/from Anthropic's `POST /v1/agents` request body for fields that have a direct counterpart there.

**Positioning anchor.** Coop is the open-source, self-hostable, vendor-neutral 1:1 of Anthropic Managed Agents (beta header `managed-agents-2026-04-01`) plus operational primitives Anthropic does not ship: triggers, hooks, reactions, standing orders, programs, OpenClaw migration.

**Non-goals for Slice 1.**

- `coop.json` schema (interface stub only — §16)
- `.coop/AGENTS.md` standing-orders schema (interface stub only)
- `.coop/programs/<slug>.md` schema (interface stub only)
- `.coop/hooks/<name>/HOOK.md` reusable hook scripts
- `.coop/prompts/` bootstrap files
- `.coop/mcp-servers/<name>.yaml` (MCP server config remains inline in `coop.json` for Slice 1)
- TypeScript agents (`.coop/agents/*.ts`)
- Multi-agent coordinator topologies
- Custom tool input schemas
- Full rubric-graded Outcomes (preview shape only — §11)

---

## 2. Resource Model & File Topology

Coop mirrors Anthropic Managed Agents' resource model, expressed as files at canonical paths.

```
your-repo/
├── coop.json                       # fleet config + reactions (interface stub)
└── .coop/
    ├── AGENTS.md                   # standing orders (interface stub)
    ├── agents/<name>.md            # this spec
    ├── environments/<name>.yaml    # container template
    ├── vaults/<name>.yaml          # credential binding declaration (no secret material)
    ├── memory-stores/<name>.yaml   # versioned, scoped memory
    ├── skills/<name>/SKILL.md      # Agent Skills format, Coop-canonical
    └── programs/<slug>.md          # reusable prompt fragments (interface stub)
```

`.coop/skills/` is the **canonical write path** for project-local skills. The Coop skill resolver MAY load Agent Skills-compatible skills from external fallback paths in the order `.claude/skills/`, `~/.claude/skills/`, `vendor/skills/`. Fallback paths are read-only import sources; `coop new skill` always writes to `.coop/skills/`.

The agent file's `name` field is the agent's **logical identifier** (kebab-case, used by refs, the CLI, and the dashboard URL). The filename (without extension) MUST equal `name`; the validator MUST reject mismatches. Renaming a file is a refactor — references that point at the old name break.

The optional `title:` field is the **human display name** (free-form, used in UIs that prefer prose). If omitted, UIs fall back to `name`. Anthropic's `name` field maps to Coop's `title` for translation purposes; Coop's `name` is the Coop-side logical ID and has no Anthropic counterpart.

---

## 3. Schema Versioning (`apiVersion`)

> Coop infers resource kind from file location. `apiVersion` is OPTIONAL in hand-authored files and RECOMMENDED in generated, shared, or production files. When omitted, the active Coop toolchain applies its default schema version and MAY emit a warning in strict validation mode.

A file pinning `apiVersion: coop.dev/v1` MUST be validated against the v1 schema even after the toolchain's default has advanced. Toolchains MUST validate against, and execute under, at minimum the two most-recent `apiVersion` lines.

The `kind:` field is **not used** — file location encodes resource kind.

---

## 4. Agent File Anatomy

Agent files are markdown with YAML frontmatter. The frontmatter declares the agent. The markdown body is the agent's natural-language briefing and is prepended to the system prompt at runtime (§14).

### 4.1 Canonical example

```yaml
---
apiVersion: coop.dev/v1
name: morning-sales-digest
title: Morning sales digest
description: Summarize new Salesforce leads each weekday morning
tags: { team: sales, env: prod }

triggers:
  cron: "0 8 * * 1-5"
  manual: true

model: claude-sonnet-4-6
session: isolated
timeout: 10m
maxTurns: 25
maxBudgetUsd: 1.0

tools: [bash, read, write, web_fetch, salesforce.search_leads, gmail.send_email, slack.send_message]

skills: [sales-scoring, lead-formatting]

environment: shared-node20
vault: sales-team
memory: sales-team-memory

resources:
  - file: ./data/scoring-rubric.csv
  - github: { repo: acme/sales-playbooks, branch: main, mount: /workspace/playbooks }

permissions:
  default: ask
  bash: allow
  "bash:rm *": deny

playbook: programs/sales-scoring.md

outcome:
  description: Digest delivered to #sales by 8:30am with qualified leads scored
  max_iterations: 3

hooks:
  on_run_end: ./hooks/log-cost
  on_error: ./hooks/notify-ops.sh
  on_tool_call:
    url: https://hooks.example.com/audit
    headers: { Authorization: "{{secret: AUDIT_TOKEN}}" }

notify:
  on_failure: "slack#ops"
  live_updates: "slack#sales-bot"
---

# Morning sales digest

Each weekday morning at 8am, gather new Salesforce leads created in the last 24 hours
and post a scored digest to #sales.
```

### 4.2 Field index

| Field | Required | Type | Anthropic counterpart |
|---|---|---|---|
| `apiVersion` | optional | string | n/a |
| `name` | **REQUIRED** | string, ≤64 chars, matches `[a-z0-9-]+`; MUST equal filename (without extension) | n/a — used as Coop logical ID |
| `title` | optional | free-form string, ≤256 chars; defaults to `name` if omitted | `name` |
| `description` | optional | string, ≤2048 chars | `description` |
| `tags` | optional | map<string, string>, ≤16 pairs | `metadata` |
| `triggers` | optional | trigger object (§5) | n/a — Coop wedge |
| `model` | **REQUIRED** | string or `{id, speed}` | `model` |
| `session` | optional | `isolated \| persistent`; default `isolated` | implicit |
| `timeout` | optional | duration string; default `10m` | implicit |
| `maxTurns` | optional | integer 1..500; default 25 | implicit |
| `maxBudgetUsd` | optional | number; no default | implicit |
| `tools` | optional | array of tool IDs (§6) | `tools[]` |
| `skills` | optional | array of skill name refs (§7) | `skills[]` |
| `environment` | optional | reference or inline (§7) | container at session creation |
| `vault` | optional | reference or inline (§7) | `vault` at session creation |
| `memory` | optional | reference or inline (§7) | `memory_store` at session creation |
| `resources` | optional | array of resource objects (§8) | session `resources[]` |
| `permissions` | optional | permission object (§9) | per-tool `permission_policy` |
| `playbook` | optional | path to `.coop/programs/<slug>.md` (§10) | n/a — Coop wedge |
| `outcome` | optional | outcome object (§11, PREVIEW) | `define_outcome` event |
| `hooks` | optional | hook map (§12) | n/a — Coop wedge |
| `notify` | optional | notify object (§13) | n/a — Coop wedge |

The schema is **closed**. Unknown top-level keys MUST cause validator rejection in strict mode and SHOULD emit warnings in lenient mode.

---

## 5. Trigger Schema

### 5.1 Surface and canonical forms

**Surface form** (what users write):

```yaml
triggers:
  cron: "0 9 * * 1-5"
  manual: true
  webhook:
    secret: "{{secret: GITHUB_WEBHOOK}}"
```

**Internal canonical form** (the post-normalization data structure the validator and runtime operate on; shown as JSON for clarity — this is never written by users):

```json
[
  { "type": "cron", "schedule": "0 9 * * 1-5" },
  { "type": "manual" },
  { "type": "webhook", "secret": "{{secret: GITHUB_WEBHOOK}}" }
]
```

The validator MUST normalize the surface map to the canonical array of typed objects before any further processing. Validators MUST surface the canonical form alongside the surface form when reporting errors (§15).

### 5.2 Built-in trigger types (reserved bare names)

| Type | Required fields | Optional fields | Notes |
|---|---|---|---|
| `cron` | `schedule` (5- or 6-field cron) | `tz` (IANA, default UTC) | scalar shortcut: `cron: "0 9 * * 1-5"` ⇒ `{schedule: "0 9 * * 1-5", tz: UTC}` |
| `heartbeat` | `every` (duration) | `active_hours: {start, end, tz}` | REQUIRES `session: persistent` |
| `webhook` | `secret` (`{{secret:}}` reference) | `path` (default: agent name) | inbound POST endpoint |
| `on_email` | `to` (email address at hosted inbox) | | requires hosted Coop or self-hosted email gateway |
| `on_slack_mention` | `channel` | | requires Coop Slack app installation |
| `on_pr_comment` | `repo` (`org/name`) | `keyword` | requires Coop GitHub app installation |
| `manual` | none (`manual: true`) | | explicit declaration that the agent is invocable from user-facing UI (dashboard "Run", web button, MCP invocation). Templates SHOULD include this unless the agent is intentionally non-interactive. See §5.7 for the CLI escape hatch. |

### 5.3 Provider-namespaced triggers

Any trigger type containing `.` is provider-namespaced (e.g., `linear.on_issue`, `discord.on_message`). The schema MUST NOT reject namespaced trigger types unknown to the core validator; they MUST be resolved by the trigger plugin system at runtime. Plugin resolution is out of scope for Slice 1.

### 5.4 Multi-instance per type

A trigger type MAY appear with an array value to declare multiple instances:

```yaml
triggers:
  cron:
    - "0 9 * * 1-5"
    - "0 12 * * 6"
```

### 5.5 Single-trigger guidance

Agents SHOULD declare one primary trigger. Multiple triggers MAY be declared when they represent the same job invoked through multiple channels. When triggers imply different jobs, the work MUST be split across separate agents.

### 5.6 Legacy alias

The singular form `trigger:` MUST be accepted as a synonym for a single-trigger `triggers:` block. Validators emit a migration warning.

### 5.7 Platform/CLI invocation is not a trigger

`coop run <agent>` and equivalent platform-admin invocation paths MUST work against any agent regardless of declared triggers. They bypass the trigger system entirely and exist for testing, dev, and admin override. Declaring `manual` is NOT required for `coop run` to work — `manual` is the user-facing-UI surface, not the admin escape hatch.

---

## 6. Tools

`tools:` is a flat array of tool identifiers.

- **Built-in tools** (bare names): `bash`, `read`, `write`, `edit`, `glob`, `grep`, `web_fetch`, `web_search`. These MUST correspond to Anthropic's `agent_toolset_20260401` toolset.
- **MCP tools** (namespaced): `<server>.<tool>` (e.g., `salesforce.search_leads`). The `<server>` portion MUST resolve against `coop.json`'s `mcp_servers` block.

Custom tools (with `input_schema`) are out of scope for Slice 1.

---

## 7. Resource References (skills, environment, vault, memory)

These fields use the **polymorphic reference syntax**: a string value is a reference by name; an object value is an inline definition.

```yaml
environment: shared-node20         # ref → .coop/environments/shared-node20.yaml
# or inline:
environment:
  packages: { apt: [ffmpeg] }

vault: sales-team                  # ref → .coop/vaults/sales-team.yaml
memory: sales-team-memory          # ref → .coop/memory-stores/sales-team-memory.yaml
skills: [sales-scoring, lead-formatting]
```

### 7.1 Resolution order

For `skills:`, the resolver MUST check paths in this order and use the first match: `.coop/skills/<name>/`, `.claude/skills/<name>/`, `~/.claude/skills/<name>/`, `vendor/skills/<name>/`. Resolution failure at validation time MUST cause the validator to error. Resolution failure at runtime MUST abort the run with a descriptive error.

For `environment:`, `vault:`, `memory:`, the resolver MUST check only `.coop/<kind>/<name>.yaml`. The same validation-time and runtime error rules apply.

### 7.2 `vault:` semantics

The agent-level `vault:` is the **default credential scope** applied to all tools that require credentials. Per-MCP-server vault overrides MAY be declared in `coop.json`. Per-agent overrides at finer granularity than the agent-level default are out of scope for Slice 1.

The `.coop/vaults/<name>.yaml` file is a **credential binding declaration**: it names the provider, scopes, refresh policy, and user-resolution rule. It MUST NOT contain secret material. Actual credentials live in a separate secret store referenced by `{{secret:}}` placeholders or out-of-band binding at deploy time.

---

## 8. Resources Block

`resources:` declares artifacts mounted into the session container at runtime.

```yaml
resources:
  - file: ./data/scoring-rubric.csv
  - file: { path: ./schema.sql, mount: /workspace/db/schema.sql }
  - github: { repo: acme/sales-playbooks, branch: main, mount: /workspace/playbooks }
```

Resource types in Slice 1:

| Type | Required | Optional | Anthropic counterpart |
|---|---|---|---|
| `file` | `path` (scalar shortcut: `file: ./x.csv`) | `mount` (absolute path inside container) | `{type: file, file_id: ...}` |
| `github` | `repo`, `branch \| commit` | `mount`, `authorization_token` (`{{secret:}}` ref) | `{type: github_repository, ...}` |

### 8.1 Legacy aliases

- The field `attachments:` MUST be accepted as a synonym for `resources:` and emit a migration warning.
- The scalar `workspace: github_pr` form is removed. Migration to `resources: - github: {...}` is required.

---

## 9. Permissions

```yaml
permissions:
  default: ask              # ask | allow | deny — default for unmatched tools
  bash: allow               # tool-level override
  "bash:rm *": deny         # glob-keyed bash sub-command rule
  gmail.send_email: ask     # MCP-tool-level override
```

Key resolution order: exact tool ID, then glob patterns in order of specificity. The first match wins. The `permissionMode:` global from earlier drafts is removed — the per-tool model is sufficient.

---

## 10. Playbook Composition

`playbook:` references a single file in `.coop/programs/<slug>.md` whose body is prepended to the system prompt after standing orders (§14).

```yaml
playbook: programs/sales-scoring.md
```

Within program bodies (and agent bodies), the runtime MUST resolve these substitutions:

- `{{secret: <name>}}` — replaced with the secret value from the bound secret store
- `{{env: <name>}}` — replaced with the named environment variable

The `{{include: <path>}}` substitution from earlier drafts is **deferred to v2** to avoid two overlapping composition mechanisms in v1.

---

## 11. Outcome (Preview)

```yaml
outcome:
  description: <natural-language description of success>
  max_iterations: 3
```

**Outcome is a preview feature in Slice 1.** Validators MUST emit a `preview-feature` warning when an outcome block is present, in **both** lenient and strict modes. Preview features do NOT cause strict-mode rejection (§15) — the whole purpose of marking something preview is to let teams adopt it under known volatility. The shape is intentionally minimal — no rubric criteria, no grader configuration — pending Anthropic's stabilization of the `define_outcome` event and grader API. Future revisions will add `rubric:` matching Anthropic's `{type: text|file, criteria: [...]}` shape.

Constraints: `max_iterations` MUST be in `[1, 20]`.

---

## 12. Hook Event Vocabulary

### 12.1 Built-in events (reserved bare names)

| Event | Fires when | Blocking | `additionalContext` honored |
|---|---|---|---|
| `on_run_start` | invocation begins | no | yes |
| `on_run_end` | invocation finishes successfully | no | no — ignored, warns |
| `on_error` | invocation fails | no | no — ignored, warns |
| `on_tool_call` | before each tool call | **yes — only blocking hook in Slice 1** | yes |
| `on_message_in` | incoming user/trigger message | no in Slice 1 | yes |
| `on_message_out` | outgoing agent message | no | no — ignored, warns |
| `on_compact` | context compacted | no | yes |

### 12.2 Blocking scope (Slice 1 language)

In Slice 1, only `on_tool_call` may block. This is a Slice-1 scope restriction, not a permanent capability restriction: `on_message_in` is reserved as a future policy gate for spam, PII, tenant boundaries, and abuse prevention.

### 12.3 Naming and namespacing

Built-in events use `on_*` snake_case. Provider-namespaced events use the form `provider.on_<event>` (e.g., `linear.on_issue_resolved`). Resolution of namespaced events is out of scope for Slice 1.

### 12.4 Handler value shape

Hook handlers follow the polymorphic reference syntax of §7:

```yaml
hooks:
  on_run_end: ./hooks/log-cost                    # local script path
  on_error: ./hooks/notify-ops.sh                 # local script path
  on_tool_call:                                   # inline HTTP webhook
    url: https://hooks.example.com/audit
    headers: { Authorization: "{{secret: AUDIT_TOKEN}}" }
```

In Slice 1, hook string values MUST be local script paths starting with `./` or `/`. Named hook references (bare strings that resolve against `.coop/hooks/<name>/HOOK.md`) are reserved syntax — Slice 1 validators MUST reject them with a `hooks-named-refs-not-in-slice1` error pointing at §18. Object values are inline definitions — Slice 1 supports the HTTP webhook shape only. Prompt-as-handler and MCP-tool-as-handler are deferred.

### 12.5 Capabilities

Hooks MAY do any of:

- **Observe** (always) — receive event JSON, return nothing or empty.
- **Inject context** — return `{ additionalContext: "..." }`. Honored only on pre-model-turn events (`on_run_start`, `on_message_in`, `on_tool_call`, `on_compact`). Returns from post-run events are ignored; strict-mode validators emit a warning.
- **Block** — return `{ decision: deny, reason: "..." }`. Honored only on `on_tool_call` in Slice 1 (§12.2).

Hooks MUST NOT mutate inputs to the next action. Mutation is deferred indefinitely.

### 12.6 Merge semantics (fleet × agent)

Hook configurations from `coop.json` (fleet scope) and the agent file (agent scope) MUST normalize to ordered arrays internally:

```yaml
# Internal canonical form for on_error:
on_error:
  - { ref: notify-platform, scope: fleet }
  - { ref: notify-team, scope: agent }
```

Hooks are **additive** by default — fleet hooks fire first, agent hooks fire second. To override the additive behavior, an agent uses the explicit replace-form: the value is an object containing `replace: true` and the new handlers as an array.

```yaml
hooks:
  on_error:
    replace: true
    handlers:
      - ./hooks/notify-team-only.sh       # any Slice 1 handler shape from §12.4 is valid in handlers[]
```

When `replace: true` is set, fleet hooks for that event are NOT executed; only the listed agent handlers fire.

---

## 13. Notify

```yaml
notify:
  on_start: silent              # silent | dashboard | <channel>
  on_success: dashboard
  on_failure: "slack#ops"
  live_updates: "slack#sales-bot"
```

`notify` is the user-facing surface for run lifecycle notifications. It is shorthand for a curated set of hooks the platform manages. Channel routing format (e.g., `slack#channel`, `email:user@example.com`, `dashboard`, `silent`) and the full set of notify keys are out of scope for Slice 1.

---

## 14. Body Markdown

The markdown body of an agent file is the agent's **briefing**. At runtime, it MUST be prepended to the model's system prompt in the following order:

1. Standing orders from `.coop/AGENTS.md` (if present)
2. Playbook body from `.coop/programs/<slug>.md` (if `playbook:` is set)
3. The agent file's own markdown body
4. Trigger-specific run context (the actual user message, webhook payload, cron tick, etc.)

Headings and structure in the body are stylistic; no parsing of body content is required.

---

## 15. Validation

Coop validators MUST support two modes:

| Finding | Strict (`coop validate --ci`) | Lenient (`coop validate`) |
|---|---|---|
| Unknown top-level frontmatter key | **error** | warning |
| Legacy alias (e.g. `attachments:`, singular `trigger:`) | warning | warning |
| Preview feature (e.g. `outcome:`) | warning | warning |
| Invalid value (out-of-range int, malformed cron) | error | error |
| Reference resolution failure (skill, env, vault, memory not found) | error | error |

The schema is closed — unknown top-level keys MUST NOT be silently accepted in either mode.

Validators MUST surface the canonical form (post-normalization) alongside the surface form when reporting errors, so users can correlate written YAML with runtime behavior.

---

## 16. Interface Stubs

These files are referenced by agents but not fully specified in Slice 1. Slice 1 fixes only their minimal interface contract:

- **`coop.json`** at repo root. MUST contain an `mcp_servers` block if agents reference MCP tools, and MAY contain a `hooks` block for fleet-scope hooks. Minimum shape:
  ```json
  {
    "mcp_servers": {
      "salesforce": { "type": "url", "url": "https://mcp.salesforce.com/v1" }
    },
    "hooks": {
      "on_error": "./hooks/notify-platform"
    }
  }
  ```
  Full schema (reactions, fleet config, billing routing) in a follow-up slice.

- **`.coop/AGENTS.md`**. MUST be valid markdown. Body content is prepended to every agent's system prompt at runtime.

- **`.coop/programs/<slug>.md`**. MUST be valid markdown. Body MAY contain `{{secret: <name>}}` and `{{env: <name>}}` substitutions. Frontmatter, if present, is reserved for future use and ignored in Slice 1.

---

## 17. Backwards Compatibility & Migration

The validator MUST accept these legacy forms with migration warnings:

| Legacy form | Canonical form | Migration class |
|---|---|---|
| `trigger:` (singular) | `triggers:` (plural) | structural rename |
| `attachments:` | `resources:` | structural rename |
| `workspace: github_pr` (scalar) | `resources: - github: {...}` | structural transform |
| `connections:` (string-to-string map of `<server>: <vault-name>`) | `vault:` at agent level + per-MCP-server `vault:` attribute in `coop.json`'s `mcp_servers` block | structural transform — agent-wide default goes to `vault:`, per-server overrides go to fleet config |
| `session: ambient` | `session: persistent` (with explicit `memory:` reference) | value rename + semantic move |

`coop import openclaw` MUST emit a per-agent diff showing all legacy-form rewrites before applying, and MUST default to dry-run.

---

## 18. Future Canonicalization & Explicitly Deferred

The following are reserved for v2 introduction with a migration tool. They are NOT active in Slice 1:

- `email` → preferred over `on_email`
- `slack.mention` → preferred over `on_slack_mention`
- `github.pr_comment` → preferred over `on_pr_comment`
- `.coop/mcp-servers/<name>.yaml` file type
- `.coop/hooks/<name>/HOOK.md` reusable hook scripts (enables bare-string named hook references in `hooks:` values; Slice 1 rejects bare strings to keep this future-compatible)
- `multiagent:` coordinator topology block
- `tools:` entries of `type: custom` with `input_schema`
- `outcome.rubric:` with criteria and grader configuration
- `{{include: <path>}}` substitution

The following were considered and explicitly NOT included in Slice 1:

- TypeScript agents (`.coop/agents/*.ts`) — markdown is the spec
- `exposedModels` and `allowModelSwitching` — chat-only with no clean semantics for cron/webhook triggers
- `harness:` field — pluralism premature; v1 ships claude-code-compatible only; opencode/codex revisited in v2
- `permissionMode:` global default — per-tool model is sufficient
- Prompt-as-handler and MCP-tool-as-handler hook handler types
- `thinking:` per-agent level — Anthropic exposes this per-request, not per-agent

---

## 19. Judgment Calls Flagged for Review

Items below were decided without explicit confirmation; revisit if any feel wrong:

1. **`session: isolated | persistent`** — `ambient` was dropped; `persistent` is the new term for "conversational state survives across runs." Alternatives: `continuous`, `stateful`. Settle on one before publish.
2. **`name` as ID, `title:` as display name** — resolved in §4 by adding `title:` as an optional human display label, with `name` as the kebab-case logical ID that MUST match filename. Confirm this split feels right; if you'd rather collapse them again (treat `name` as both), say the word.
3. **`workspace:` field dropped** — the documented `workspace: private | shared:<n> | none` is replaced by the combination of `environment:` + `resources:` + `memory:`. This is the biggest break from the published docs.
4. **`workspace.*` and `memory.*` glob tools dropped** — implicit since the environment provides filesystem and memory mounts.
5. **`thinking:` field dropped** — Anthropic does not expose per-agent thinking; it's a per-request hint. If you want it as a Coop convenience knob, easy to add to §4.2.
6. **`exposedModels` fully dropped, not reserved** — §18 mentions it as explicitly excluded. If you want it reserved for v2 instead of dropped, move the bullet.
7. **`tags` capped at 16 pairs** — mirrors Anthropic's metadata limit. Lower or higher caps are fine; flag if you have an opinion.

---

## Appendix A — Companion Diagrams

- **Slice 1 scope**: <https://merm.sh/d/16SNbmF4en>
- **Anthropic Managed Agents mirror + Coop wedge**: <https://merm.sh/d/vCabNxvb2H>
- **Directory layout (option B, corrected)**: <https://merm.sh/d/yW5ijzDs7j>
