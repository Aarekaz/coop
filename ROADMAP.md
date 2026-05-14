# Roadmap

Coop's long-term goal is a vendor-independent managed-agent stack: the agent
configuration model should be portable across hosted APIs, self-hosted
runtimes, and local development tools.

## Slice 1: Agent File Format

Implemented.

- `.coop/agents/<name>.md` parser
- Canonical TypeScript types
- Closed JSON Schema
- Normalizers for triggers, resources, and legacy aliases
- Reference checks for environments, vaults, memory stores, and skills
- `coop validate`

## Slice 2: Project Validation

Implemented core.

- Schemas for `.coop/environments/*.yaml`
- Schemas for `.coop/vaults/*.yaml`
- Schemas for `.coop/memory-stores/*.yaml`
- `coop validate .`
- `coop init`
- `coop new agent`

Deferred to Slice 2.5:

- Anthropic import/export mapping

## Slice 2.5: Portability Mappings

- Anthropic import/export mapping
- Round-trip tests for fields with direct Anthropic counterparts
- Warnings for Coop-only fields that cannot export losslessly

## Slice 3: Local Runtime

- `coop run .coop/agents/<name>.md`
- MCP server loading
- Sandbox/environment provisioning
- Local memory store adapter
- Local vault adapter
- Structured run logs

## Slice 4: Trigger Workers

- Cron and heartbeat scheduler
- Webhook receiver
- Email, Slack mention, and PR comment adapters
- Trigger plugin interface for provider-namespaced triggers

## Slice 5: Managed Control Plane

- Dashboard
- Fleet-level config editor
- Run history
- Hook/event inspection
- Hosted trigger ingress
- Multi-agent coordinator
