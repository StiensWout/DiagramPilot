#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runMcpCli } from "./cli.js";

export * from "./cli.js";
export * from "./registry.js";
export * from "./runtime.js";
export * from "./server.js";
export * from "./types.js";

function realpathIfPresent(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return path.resolve(filePath);
  }
}

const directEntryPath =
  process.argv[1] === undefined ? undefined : realpathIfPresent(process.argv[1]);

if (directEntryPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await runMcpCli(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
