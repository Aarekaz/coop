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

tools: [bash, read, salesforce.search_leads, slack.send_message]
skills: [sales-scoring]

environment: shared-node20
vault: sales-team
memory: sales-team-memory

resources:
  - file: ./data/scoring-rubric.csv

permissions:
  default: ask
  bash: allow

hooks:
  on_run_end: ./hooks/log-cost.sh
---

# Morning sales digest

Gather new Salesforce leads created in the last 24 hours, score them, and post
a concise digest to the sales channel.
