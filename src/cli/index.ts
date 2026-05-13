import { reportFile } from "../validator/report";
import path from "node:path";

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CliEnv {
  repoRoot: string;
  homeDir?: string;
}

export async function runCli(argv: string[], env: CliEnv): Promise<CliRunResult> {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return {
      exitCode: 0,
      stdout: `Usage: coop validate <path> [--mode=strict|lenient]

Commands:
  validate <path>   Validate a .coop/agents/<name>.md file

Flags:
  --mode=strict     Strict mode (default): unknown keys are errors
  --mode=lenient    Lenient mode: unknown keys are warnings
  --help, -h        Show this message

Exit codes:
  0  validation ok
  1  validation failed
  2  usage error
`,
      stderr: "",
    };
  }

  const [cmd, ...rest] = argv;
  if (cmd !== "validate") {
    return usage("Unknown command");
  }
  const positional = rest.filter((a) => !a.startsWith("--"));
  const flags = Object.fromEntries(
    rest
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v ?? "true"];
      }),
  );
  if (positional.length !== 1) {
    return usage("validate requires exactly one path");
  }
  const file = path.resolve(env.repoRoot, positional[0]);
  const mode = (flags.mode === "lenient" ? "lenient" : "strict") as "strict" | "lenient";

  const result = await reportFile(file, { mode, repoRoot: env.repoRoot, homeDir: env.homeDir });

  let stdout = "";
  let stderr = "";

  for (const w of result.warnings) {
    stdout += `warn: [${w.code}] ${w.message}${w.path ? ` (${w.path})` : ""}\n`;
  }
  for (const e of result.errors) {
    stderr += `error: [${e.code}] ${e.message}${e.path ? ` (${e.path})` : ""}\n`;
  }

  if (result.ok) {
    stdout += `ok: ${file} (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})\n`;
    return { exitCode: 0, stdout, stderr };
  }
  return { exitCode: 1, stdout, stderr };
}

function usage(reason: string): CliRunResult {
  return {
    exitCode: 2,
    stdout: "",
    stderr: `${reason}\nUsage: coop validate <path> [--mode=strict|lenient]\n`,
  };
}
