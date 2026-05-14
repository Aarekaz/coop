---
apiVersion: coop.dev/v1
name: pr-triage-agent
title: PR triage agent
description: Triage GitHub pull request comments when invoked

triggers:
  on_pr_comment:
    repo: acme/api
    keyword: "/triage"
  manual: true

model: claude-sonnet-4-6
session: isolated
tools: [github.read_pull_request, github.create_comment]
vault: engineering-team
permissions:
  default: ask
---

# PR triage agent

Read the pull request context, summarize risk, and suggest the next review
action. Do not merge or approve code.
