#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMcpCli } from "@diagrampilot/mcp";

import { planCommand } from "./command-planning.js";
import { executeCommandPlan } from "./execution.js";
import { runInit } from "./init-command.js";
import type { CliStreams } from "./types.js";

export { planCommand } from "./command-planning.js";
export type {
  CommandPlan,
  CommandPlanningDependencies,
  CommandWriteIntent,
} from "./command-planning.js";
export type { CliStreams, Writable } from "./types.js";

export async function run(
  args: readonly string[],
  streams: CliStreams,
): Promise<number> {
  const [firstArg] = args;

  if (firstArg === "init") {
    return runInit(args.slice(1), streams);
  }

  if (firstArg === "mcp") {
    return runMcpCli(args.slice(1), streams, {
      commandName: "diagrampilot mcp",
    });
  }

  return executeCommandPlan(await planCommand(args), streams);
}

function realpathIfPresent(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

function isDirectEntryPoint(): boolean {
  const entryPath = process.argv[1];

  if (entryPath === undefined) {
    return false;
  }

  return realpathIfPresent(entryPath) === fileURLToPath(import.meta.url);
}

if (isDirectEntryPoint()) {
  process.exitCode = await run(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
