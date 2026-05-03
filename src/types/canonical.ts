export type ApiVersion = `coop.dev/v${number}`;
export type SessionMode = "isolated" | "persistent";

export interface CronTrigger {
  type: "cron";
  schedule: string;
  tz?: string;
}

export interface HeartbeatTrigger {
  type: "heartbeat";
  every: string;
  active_hours?: { start: string; end: string; tz?: string };
}

export interface WebhookTrigger {
  type: "webhook";
  secret: string;
  path?: string;
}

export interface OnEmailTrigger {
  type: "on_email";
  to: string;
}

export interface OnSlackMentionTrigger {
  type: "on_slack_mention";
  channel: string;
}

export interface OnPrCommentTrigger {
  type: "on_pr_comment";
  repo: string;
  keyword?: string;
}

export interface ManualTrigger {
  type: "manual";
}

// Namespaced triggers MUST contain a "." in the type, which prevents this
// branch from swallowing built-in bare-name trigger types.
export interface NamespacedTrigger {
  type: `${string}.${string}`;
  [k: string]: unknown;
}

export type BuiltInTrigger =
  | CronTrigger
  | HeartbeatTrigger
  | WebhookTrigger
  | OnEmailTrigger
  | OnSlackMentionTrigger
  | OnPrCommentTrigger
  | ManualTrigger;

export type Trigger = BuiltInTrigger | NamespacedTrigger;

export type Permission = "ask" | "allow" | "deny";

export interface Permissions {
  default?: Permission;
  [toolOrGlob: string]: Permission | undefined;
}

export interface FileResource {
  type: "file";
  path: string;
  mount?: string;
}

export interface GithubResource {
  type: "github";
  repo: string;
  branch?: string;
  commit?: string;
  mount?: string;
  authorization_token?: string;
}

export type Resource = FileResource | GithubResource;

export interface HttpHookHandler {
  url: string;
  headers?: Record<string, string>;
}

export type HookHandler = string | HttpHookHandler;

export interface ReplaceHook {
  replace: true;
  handlers: HookHandler[];
}

export type HookValue = HookHandler | ReplaceHook;

export interface Hooks {
  on_run_start?: HookValue;
  on_run_end?: HookValue;
  on_error?: HookValue;
  on_tool_call?: HookValue;
  on_message_in?: HookValue;
  on_message_out?: HookValue;
  on_compact?: HookValue;
  [namespacedEvent: string]: HookValue | undefined;
}

export interface Notify {
  on_start?: string;
  on_success?: string;
  on_failure?: string;
  live_updates?: string;
}

export interface Outcome {
  description: string;
  max_iterations?: number;
}

export interface InlineEnvironment {
  packages?: {
    apt?: string[];
    npm?: string[];
    pip?: string[];
    [k: string]: string[] | undefined;
  };
  baseImage?: string;
  [k: string]: unknown;
}

export type EnvironmentRef = string | InlineEnvironment;
export type VaultRef = string | Record<string, unknown>;
export type MemoryRef = string | Record<string, unknown>;

export interface CanonicalAgent {
  apiVersion?: ApiVersion;
  name: string;
  title?: string;
  description?: string;
  tags?: Record<string, string>;

  triggers?: Trigger[];

  model: string | { id: string; speed?: "standard" | "fast" };
  session?: SessionMode;
  timeout?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;

  tools?: string[];
  skills?: string[];

  environment?: EnvironmentRef;
  vault?: VaultRef;
  memory?: MemoryRef;

  resources?: Resource[];
  permissions?: Permissions;
  playbook?: string;
  outcome?: Outcome;
  hooks?: Hooks;
  notify?: Notify;
}
