# Examples

Each example is a small Coop project showing how `.coop/agents/<name>.md`
fits with the referenced files it names.

Run validation from the example directory:

```bash
bun run ../../bin/coop validate .coop/agents/morning-sales-digest.md
```

## Included

- `morning-sales-digest`: scheduled sales digest with env, vault, memory, skill, and resource refs
- `pr-triage-agent`: PR comment triggered triage agent
- `slack-support-agent`: Slack mention triggered responder
