---
apiVersion: coop.dev/v1
name: slack-support-agent
title: Slack support agent
description: Respond to support mentions in Slack

triggers:
  on_slack_mention:
    channel: "#support"
  manual: true

model: claude-sonnet-4-6
session: persistent
tools: [slack.read_thread, slack.send_message, linear.create_issue]
memory: support-memory
vault: support-team
permissions:
  default: ask
---

# Slack support agent

Answer support questions in Slack. When the issue needs engineering follow-up,
summarize the thread and draft a Linear issue.
