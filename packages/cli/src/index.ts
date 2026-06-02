#!/usr/bin/env node
import { realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDiagramPilotVersion } from "@diagrampilot/core";

type Writable = Pick<NodeJS.WritableStream, "write">;

interface CliStreams {
  stdout: Writable;
  stderr: Writable;
}

function writeLine(stream: Writable, message: string): void {
  stream.write(`${message}\n`);
}

function helpText(): string {
  return [
    `diagrampilot ${getDiagramPilotVersion()}`,
    "",
    "Usage:",
    "  diagrampilot --version",
    "  diagrampilot --help",
    "",
    "MVP commands:",
    "  init",
    "  validate",
    "  render",
    "  export",
  ].join("\n");
}

export function run(args: readonly string[], streams: CliStreams): number {
  const [firstArg] = args;

  if (firstArg === "--version" || firstArg === "-v") {
    writeLine(streams.stdout, `diagrampilot ${getDiagramPilotVersion()}`);
    return 0;
  }

  if (firstArg === undefined || firstArg === "--help" || firstArg === "-h") {
    writeLine(streams.stdout, helpText());
    return 0;
  }

  writeLine(streams.stderr, `Unknown command or option: ${firstArg}`);
  writeLine(streams.stderr, "Run `diagrampilot --help` for usage.");
  return 1;
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
  process.exitCode = run(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
