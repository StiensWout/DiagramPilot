#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getDiagramPilotVersion,
  loadDiagramPilotSourceFile,
  type SourceLoadFailure,
} from "@diagrampilot/core";

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
    "  validate <path>",
    "  render",
    "  export",
  ].join("\n");
}

const supportFiles = [
  {
    path: "llms.txt",
    lines: [
      "# DiagramPilot",
      "",
      "DiagramPilot is a local-first, repo-native diagram compiler for AI coding agents.",
      "",
      "Use DiagramSpec as the source of truth in `*.dp.yaml` or `*.dp.json` files.",
      "Generated SVG, Mermaid, D2, DOT, and PNG files are Derived Artifacts.",
      "",
      "Start with the public agent docs:",
      "",
      "- https://diagrampilot.com/llms.txt",
      "- https://diagrampilot.com/docs/agents/quickstart.md",
      "- https://diagrampilot.com/docs/agents/spec.md",
      "- https://diagrampilot.com/docs/agents/error-repair.md",
      "",
      "Minimal commands:",
      "",
      "```bash",
      "diagrampilot validate docs/architecture.dp.yaml",
      "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
      "```",
      "",
    ],
  },
  {
    path: "docs/diagrampilot.md",
    lines: [
      "# DiagramPilot",
      "",
      "DiagramSpec is the source of truth for repository diagrams.",
      "",
      "Author DiagramPilot Source Files as `*.dp.yaml` or `*.dp.json`.",
      "Prefer YAML for human- and agent-authored diagrams.",
      "",
      "Validate before rendering:",
      "",
      "```bash",
      "diagrampilot validate docs/architecture.dp.yaml",
      "```",
      "",
      "Render only with an explicit output path:",
      "",
      "```bash",
      "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
      "```",
      "",
      "Public docs: https://diagrampilot.com/llms.txt",
      "",
    ],
  },
] as const;

const managedSectionStart = "<!-- diagrampilot:init:start -->";
const managedSectionEnd = "<!-- diagrampilot:init:end -->";

function managedSection(lines: readonly string[]): string {
  return [managedSectionStart, ...lines, managedSectionEnd, ""].join("\n");
}

function appendManagedSection(existingContent: string, section: string): string {
  const existingWithTrailingNewline = existingContent.endsWith("\n")
    ? existingContent
    : `${existingContent}\n`;
  const separator = existingWithTrailingNewline.endsWith("\n\n") ? "" : "\n";

  return `${existingWithTrailingNewline}${separator}${section}`;
}

function replaceManagedSection(existingContent: string, section: string): string {
  const startIndex = existingContent.indexOf(managedSectionStart);
  const endIndex = existingContent.indexOf(managedSectionEnd, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    return appendManagedSection(existingContent, section);
  }

  const contentAfterEnd = existingContent
    .slice(endIndex + managedSectionEnd.length)
    .replace(/^\r?\n/, "");

  return `${existingContent.slice(0, startIndex)}${section}${contentAfterEnd}`;
}

function runInit(streams: CliStreams): number {
  for (const supportFile of supportFiles) {
    const filePath = path.resolve(process.cwd(), supportFile.path);
    const section = managedSection(supportFile.lines);

    mkdirSync(path.dirname(filePath), { recursive: true });

    if (!existsSync(filePath)) {
      writeFileSync(filePath, section, "utf8");
      writeLine(streams.stdout, `Created ${supportFile.path}`);
      continue;
    }

    const existingContent = readFileSync(filePath, "utf8");
    const nextContent = replaceManagedSection(existingContent, section);

    if (nextContent === existingContent) {
      writeLine(streams.stdout, `Unchanged ${supportFile.path}`);
      continue;
    }

    writeFileSync(filePath, nextContent, "utf8");
    writeLine(streams.stdout, `Updated ${supportFile.path}`);
  }

  return 0;
}

function formatSourceFailure(failure: SourceLoadFailure): string {
  if (failure.kind === "read") {
    return `Unable to read ${failure.path}: ${failure.message}`;
  }

  const location =
    failure.line === undefined || failure.column === undefined
      ? ""
      : ` at line ${failure.line}, column ${failure.column}`;
  const formatLabel = failure.format.toUpperCase();

  return `${formatLabel} parse error in ${failure.path}${location}: ${failure.message}`;
}

function runValidate(args: readonly string[], streams: CliStreams): number {
  const [sourcePath] = args;

  if (sourcePath === undefined) {
    writeLine(streams.stderr, "Missing source path.");
    writeLine(streams.stderr, "Usage: diagrampilot validate <path>");
    return 1;
  }

  const result = loadDiagramPilotSourceFile(sourcePath);

  if (!result.ok) {
    writeLine(streams.stderr, formatSourceFailure(result.failure));
    return 1;
  }

  writeLine(streams.stdout, `Valid ${result.source.path}`);
  return 0;
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

  if (firstArg === "init") {
    return runInit(streams);
  }

  if (firstArg === "validate") {
    return runValidate(args.slice(1), streams);
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
