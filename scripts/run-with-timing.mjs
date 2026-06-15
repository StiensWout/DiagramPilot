#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function parseArgs(args) {
  const separatorIndex = args.indexOf("--");

  if (separatorIndex <= 0 || separatorIndex === args.length - 1) {
    throw new Error(
      'Usage: node scripts/run-with-timing.mjs "<label>" -- <command> [args...]',
    );
  }

  return {
    label: args.slice(0, separatorIndex).join(" "),
    command: args[separatorIndex + 1],
    commandArgs: args.slice(separatorIndex + 2),
  };
}

function formatSeconds(startedAt) {
  return ((performance.now() - startedAt) / 1000).toFixed(2);
}

function runTimedCommand({ label, command, commandArgs }) {
  const startedAt = performance.now();
  console.log(`Timing: ${label} started.`);

  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  const seconds = formatSeconds(startedAt);

  console.log(`Timing: ${label} completed in ${seconds}s.`);
  console.log(`::notice title=Timing::${label} completed in ${seconds}s`);

  return result.status ?? 1;
}

try {
  process.exitCode = runTimedCommand(parseArgs(process.argv.slice(2)));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
