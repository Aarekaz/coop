import type { Trigger } from "../types/canonical";

export interface NormalizerWarning {
  code: string;
  message: string;
  path?: (string | number)[];
}

export interface TriggerNormResult {
  triggers: Trigger[] | undefined;
  warnings: NormalizerWarning[];
}

type RawValue = unknown;
type RawTriggersMap = Record<string, RawValue>;

const SCALAR_SHORTHANDS: Record<string, (v: unknown) => Record<string, unknown>> = {
  cron: (v) => ({ schedule: v }),
  webhook: (v) => ({ secret: v }),
  on_email: (v) => ({ to: v }),
  on_slack_mention: (v) => ({ channel: v }),
  on_pr_comment: (v) => ({ repo: v }),
};

export function normalizeTriggers(triggersField: unknown, legacyTriggerField: unknown): TriggerNormResult {
  if (triggersField !== undefined && legacyTriggerField !== undefined) {
    throw new Error("both 'triggers:' and singular 'trigger:' present - use one");
  }

  const warnings: NormalizerWarning[] = [];
  const source = triggersField ?? legacyTriggerField;
  if (source === undefined) return { triggers: undefined, warnings };
  if (!isRawTriggersMap(source)) {
    throw new Error("'triggers:' must be a map of trigger type to trigger configuration");
  }

  if (legacyTriggerField !== undefined) {
    warnings.push({
      code: "trigger-singular-alias",
      message: "Singular 'trigger:' is a legacy alias; rename to 'triggers:'",
    });
  }

  const triggers: Trigger[] = [];

  for (const [type, raw] of Object.entries(source)) {
    const instances = Array.isArray(raw) ? raw : [raw];
    for (const inst of instances) {
      triggers.push(buildTrigger(type, inst));
    }
  }

  return { triggers, warnings };
}

function isRawTriggersMap(value: unknown): value is RawTriggersMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildTrigger(type: string, raw: unknown): Trigger {
  if (type === "manual") {
    if (raw !== true) {
      throw new Error(`manual trigger value must be 'true', got ${JSON.stringify(raw)}`);
    }
    return { type: "manual" };
  }

  if (typeof raw !== "object" || raw === null) {
    const expand = SCALAR_SHORTHANDS[type];
    if (!expand) {
      throw new Error(`Trigger type '${type}' has no scalar shortcut; use object form`);
    }
    return { type, ...expand(raw) } as Trigger;
  }

  return { type, ...(raw as Record<string, unknown>) } as Trigger;
}
