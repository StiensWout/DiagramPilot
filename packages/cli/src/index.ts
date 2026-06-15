#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { planCommand } from "./command-planning.js";
import { executeCommandPlan } from "./execution.js";
import { runInit } from "./init-command.js";
import type { CliStreams } from "./types.js";
import { runWatch } from "./watch-command.js";

function mcpPackageHintText(): string {
  return [
    "DiagramPilot MCP moved to the optional @diagrampilot/mcp package.",
    "",
    "Install it when a local MCP client needs DiagramPilot tools:",
    "  npm install --save-dev @diagrampilot/mcp",
    "",
    "Launch the dedicated MCP server executable:",
    "  diagrampilot-mcp",
    "",
    "The core diagrampilot package keeps CLI and CI workflows free of MCP runtime dependencies.",
    "",
  ].join("\n");
}

function runMcpCompatibilityHint(
  args: readonly string[],
  streams: CliStreams,
): number {
  const isHelpRequest = args.includes("--help") || args.includes("-h");
  const output = mcpPackageHintText();

  if (isHelpRequest) {
    streams.stdout.write(output);
    return 0;
  }

  streams.stderr.write(output);
  return 1;
}

export { planCommand } from "./command-planning.js";
export type {
  CommandPlan,
  CommandPlanningDependencies,
  CommandWriteIntent,
} from "./command-planning.js";
export type { CliStreams, Writable } from "./types.js";
export { runWatch } from "./watch-command.js";
export type {
  WatchChange,
  WatchCommandDependencies,
  WatchCreateOptions,
  WatchCycleResult,
  WatchHandle,
  WatchScheduler,
} from "./watch-command.js";

export async function run(
  args: readonly string[],
  streams: CliStreams,
): Promise<number> {
  const [firstArg] = args;

  if (firstArg === "init") {
    return runInit(args.slice(1), streams);
  }

  if (firstArg === "mcp") {
    return runMcpCompatibilityHint(args.slice(1), streams);
  }

  if (firstArg === "watch") {
    return runWatch(args.slice(1), streams);
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
