# Roadmap

Coop's long-term goal is a vendor-independent managed-agent stack: the agent
configuration model should be portable across hosted APIs, self-hosted
runtimes, and local development tools.

## Slice 1: Agent File Format

Current repository state.

- `.coop/agents/<name>.md` parser
- Canonical TypeScript types
- Closed JSON Schema
- Normalizers for triggers, resources, and legacy aliases
- Reference checks for environments, vaults, memory stores, and skills
- `coop validate`

## Slice 2: Project Validation

- Schemas for `.coop/environments/*.yaml`
- Schemas for `.coop/vaults/*.yaml`
- Schemas for `.coop/memory-stores/*.yaml`
- `coop validate .`
- `coop init`
- `coop new agent`
- Anthropic import/export mapping

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
