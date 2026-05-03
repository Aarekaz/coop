import { describe, it } from "vitest";
import type { CanonicalAgent, Trigger, Hooks } from "../../src/types/canonical";

describe("canonical types", () => {
  it("compiles a realistic agent literal", () => {
    const agent: CanonicalAgent = {
      apiVersion: "coop.dev/v1",
      name: "morning-sales-digest",
      title: "Morning sales digest",
      model: "claude-sonnet-4-6",
      session: "isolated",
      triggers: [
        { type: "cron", schedule: "0 8 * * 1-5" },
        { type: "manual" },
      ],
      tools: ["bash", "salesforce.search_leads"],
      skills: ["sales-scoring"],
      environment: "shared-node20",
      hooks: {
        on_run_end: "./hooks/log-cost",
        on_tool_call: { url: "https://hooks.example.com/audit" },
        on_error: { replace: true, handlers: ["./hooks/notify-team-only.sh"] },
      },
    };
    void agent;
  });

  it("rejects unknown trigger fields when annotated as the typed kind", () => {
    // @ts-expect-error - "manual" has no other fields
    const bad: Trigger = { type: "manual", schedule: "0 9 * * *" };
    void bad;
  });

  it("hooks accepts polymorphic handler shapes", () => {
    const h: Hooks = {
      on_run_start: "./a.sh",
      on_tool_call: { url: "https://x", headers: { auth: "y" } },
    };
    void h;
  });
});
