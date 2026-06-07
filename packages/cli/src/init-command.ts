import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { writeLine } from "./cli-output.js";
import type { CliStreams } from "./types.js";

const supportFiles = [
  {
    path: "llms.txt",
    lines: [
      "# DiagramPilot",
      "",
      "DiagramPilot is a local-first, repo-native diagram compiler for AI coding agents.",
      "",
      "Use DiagramSpec as the source of truth in `*.dp.yaml` files.",
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
      "diagrampilot check",
      "diagrampilot validate docs/architecture.dp.yaml",
      "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
      "```",
      "",
      "`diagrampilot check` is the read-only repo review/CI command.",
      "`diagrampilot validate <source>` is the explicit source repair command.",
      "`diagrampilot render <source> --out <artifact.svg>` refreshes the explicit artifact.",
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
      "Author DiagramPilot Source Files as `*.dp.yaml`.",
      "`*.dp.json` is no longer a DiagramPilot source format.",
      "",
      "Run the read-only repo review/CI command first:",
      "",
      "```bash",
      "diagrampilot check",
      "```",
      "",
      "Use validate for explicit source repair:",
      "",
      "```bash",
      "diagrampilot validate docs/architecture.dp.yaml",
      "```",
      "",
      "Refresh the explicit SVG artifact only with render and `--out`:",
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

const repoWorkflowConfigPath = "diagrampilot.config.yaml";
const repoWorkflowConfigContent = "version: 1\n";
const managedSectionStart = "<!-- diagrampilot:init:start -->";
const managedSectionEnd = "<!-- diagrampilot:init:end -->";

function initUsageText(): string {
  return "Usage: diagrampilot init [--docs] [--config]";
}

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

function writeSupportFiles(streams: CliStreams): void {
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
}

export function runInit(args: readonly string[], streams: CliStreams): number {
  if (args.length === 0) {
    writeLine(streams.stdout, "Local agent docs were not installed.");
    writeLine(streams.stdout, "Run `diagrampilot init --docs` to add them.");
    writeLine(
      streams.stdout,
      "Run `diagrampilot init --config` to add Repo Workflow Configuration.",
    );
    return 0;
  }

  let shouldWriteDocs = false;
  let shouldWriteConfig = false;

  for (const arg of args) {
    if (arg === "--docs") {
      shouldWriteDocs = true;
      continue;
    }

    if (arg === "--config") {
      shouldWriteConfig = true;
      continue;
    }

    writeLine(streams.stderr, `Unknown init option: ${arg}`);
    writeLine(streams.stderr, initUsageText());
    return 1;
  }

  const configPath = path.resolve(process.cwd(), repoWorkflowConfigPath);

  if (shouldWriteConfig && existsSync(configPath)) {
    writeLine(
      streams.stderr,
      `Repo Workflow Configuration already exists: ${repoWorkflowConfigPath}`,
    );
    writeLine(
      streams.stderr,
      "Suggestion: edit the existing config, or remove it before rerunning `diagrampilot init --config`.",
    );
    return 1;
  }

  if (shouldWriteConfig) {
    writeFileSync(configPath, repoWorkflowConfigContent, "utf8");
    writeLine(streams.stdout, `Created ${repoWorkflowConfigPath}`);
  }

  if (shouldWriteDocs) {
    writeSupportFiles(streams);
  }

  return 0;
}
