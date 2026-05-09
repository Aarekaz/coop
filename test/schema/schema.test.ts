import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import schema from "../../src/schema/agent.schema.json" with { type: "json" };

describe("agent.schema.json", () => {
  const ajv = new Ajv({ strict: true, allErrors: true });
  const validate = ajv.compile(schema);

  it("accepts the canonical example from spec §4.1", () => {
    const agent = {
      apiVersion: "coop.dev/v1",
      name: "morning-sales-digest",
      title: "Morning sales digest",
      description: "Summarize new Salesforce leads each weekday morning",
      model: "claude-sonnet-4-6",
      session: "isolated",
      triggers: [{ type: "cron", schedule: "0 8 * * 1-5" }, { type: "manual" }],
      tools: ["bash", "salesforce.search_leads"],
      skills: ["sales-scoring"],
      environment: "shared-node20",
      vault: "sales-team",
      memory: "sales-team-memory",
      resources: [{ type: "file", path: "./data/scoring-rubric.csv" }],
      permissions: { default: "ask", bash: "allow", "bash:rm *": "deny" },
      playbook: "programs/sales-scoring.md",
      outcome: { description: "Digest delivered to #sales", max_iterations: 3 },
      hooks: {
        on_run_end: "./hooks/log-cost",
        on_tool_call: { url: "https://hooks.example.com/audit" },
      },
      notify: { on_failure: "slack#ops" },
    };
    const ok = validate(agent);
    if (!ok) console.error(validate.errors);
    expect(ok).toBe(true);
  });

  it("rejects unknown top-level keys", () => {
    const bad = { name: "foo", model: "m", surprise: "no" };
    expect(validate(bad)).toBe(false);
    expect(validate.errors?.[0]?.keyword).toBe("additionalProperties");
  });

  it("rejects an outcome.max_iterations > 20", () => {
    const bad = {
      name: "foo",
      model: "m",
      outcome: { description: "x", max_iterations: 25 },
    };
    expect(validate(bad)).toBe(false);
  });

  it("rejects missing required name", () => {
    const bad = { model: "m" };
    expect(validate(bad)).toBe(false);
  });

  it("accepts model as object with speed", () => {
    const ok = { name: "foo", model: { id: "claude-sonnet-4-6", speed: "fast" } };
    expect(validate(ok)).toBe(true);
  });

  it("rejects cron trigger missing required schedule", () => {
    const bad = { name: "foo", model: "m", triggers: [{ type: "cron" }] };
    expect(validate(bad)).toBe(false);
  });

  it("rejects on_pr_comment trigger missing required repo", () => {
    const bad = { name: "foo", model: "m", triggers: [{ type: "on_pr_comment" }] };
    expect(validate(bad)).toBe(false);
  });

  it("rejects manual trigger with extra fields", () => {
    const bad = { name: "foo", model: "m", triggers: [{ type: "manual", schedule: "0 9 * * *" }] };
    expect(validate(bad)).toBe(false);
  });

  it("accepts provider-namespaced trigger with arbitrary fields", () => {
    const ok = {
      name: "foo",
      model: "m",
      triggers: [{ type: "linear.on_issue", team: "ENG", label: "customer" }],
    };
    expect(validate(ok)).toBe(true);
  });

  it("rejects bare-name trigger that isn't a known built-in (no dot, no match)", () => {
    const bad = { name: "foo", model: "m", triggers: [{ type: "unknownbuiltin" }] };
    expect(validate(bad)).toBe(false);
  });
});
