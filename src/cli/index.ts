import { reportFile } from "../validator/report";
import { reportProject } from "../validator/project";
import { initProject, newAgent } from "./scaffold";
import path from "node:path";
import { stat } from "node:fs/promises";

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
      stdout: `Usage: coop <command> [args]

Commands:
  validate <path>        Validate an agent file or Coop project directory
  init                   Create the .coop directory structure
  new agent <name>       Create a starter .coop/agents/<name>.md file

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
  if (cmd === "init") {
    try {
      await initProject(env.repoRoot);
      return { exitCode: 0, stdout: `ok: initialized Coop project at ${env.repoRoot}\n`, stderr: "" };
    } catch (e) {
      return errorResult("init-failed", e);
    }
  }

  if (cmd === "new") {
    const [kind, name] = rest;
    if (kind !== "agent" || !name || rest.length !== 2) {
      return usage("new requires: coop new agent <name>");
    }
    try {
      const file = await newAgent(env.repoRoot, name);
      return { exitCode: 0, stdout: `ok: created ${file}\n`, stderr: "" };
    } catch (e) {
      return errorResult("new-agent-failed", e);
    }
  }

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

  let result;
  let isProject = false;
  try {
    isProject = (await stat(file)).isDirectory();
  } catch {
    isProject = false;
  }
  if (isProject) {
    result = await reportProject(file, { mode, homeDir: env.homeDir });
  } else {
    result = await reportFile(file, { mode, repoRoot: env.repoRoot, homeDir: env.homeDir });
  }

  let stdout = "";
  let stderr = "";

  for (const w of result.warnings) {
    stdout += `warn: [${w.code}] ${w.message}${w.path ? ` (${w.path})` : ""}\n`;
  }
  for (const e of result.errors) {
    stderr += `error: [${e.code}] ${e.message}${e.path ? ` (${e.path})` : ""}\n`;
  }

  if (result.ok) {
    if ("files" in result && Array.isArray(result.files)) {
      stdout += `ok: ${file} (${result.files.length} files, ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})\n`;
    } else {
      stdout += `ok: ${file} (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})\n`;
    }
    return { exitCode: 0, stdout, stderr };
  }
  return { exitCode: 1, stdout, stderr };
}

function errorResult(code: string, error: unknown): CliRunResult {
  const message = error instanceof Error ? error.message : String(error);
  return { exitCode: 1, stdout: "", stderr: `error: [${code}] ${message}\n` };
}

function usage(reason: string): CliRunResult {
  return {
    exitCode: 2,
    stdout: "",
    stderr: `${reason}\nUsage: coop <command> [args]\n`,
  };
}
