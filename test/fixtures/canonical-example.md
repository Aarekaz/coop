---
apiVersion: coop.dev/v1
name: canonical-example
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

tools: [bash, read, write, web_fetch, salesforce.search_leads]

skills: [sales-scoring]

environment: shared-node20
vault: sales-team
memory: sales-team-memory

resources:
  - file: ./data/scoring-rubric.csv

permissions:
  default: ask
  bash: allow

playbook: programs/sales-scoring.md

outcome:
  description: Digest delivered to #sales by 8:30am with qualified leads scored
  max_iterations: 3

hooks:
  on_run_end: ./hooks/log-cost
  on_error: ./hooks/notify-ops.sh

notify:
  on_failure: "slack#ops"
---

# Morning sales digest
Each weekday morning...
