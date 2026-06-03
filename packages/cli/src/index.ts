#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type DiagramSpec,
  type DiagramSpecValidationError,
  getDiagramPilotVersion,
  loadDiagramPilotSourceFile,
  type SourceLoadFailure,
  validateDiagramSpec,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  renderDiagramSpecToSvg,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
} from "@diagrampilot/render-svg";

type Writable = Pick<NodeJS.WritableStream, "write">;

interface CliStreams {
  stdout: Writable;
  stderr: Writable;
}

interface ValidateOptions {
  json: boolean;
  sourcePath: string;
}

interface ExportOptions {
  format: "d2" | "mermaid";
  outPath?: string;
  sourcePath: string;
}

interface RenderCommandOptions {
  outPath: string;
  sourcePath: string;
}

type ValidateArgsResult =
  | {
      ok: true;
      options: ValidateOptions;
    }
  | {
      ok: false;
      message: string;
    };

type ExportArgsResult =
  | {
      ok: true;
      options: ExportOptions;
    }
  | {
      ok: false;
      message: string;
    };

type RenderArgsResult =
  | {
      ok: true;
      options: RenderCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

interface StructuredValidationResult {
  file: string;
  ok: boolean;
  errors: DiagramSpecValidationError[];
}

function writeLine(stream: Writable, message: string): void {
  stream.write(`${message}\n`);
}

function writeJsonLine(stream: Writable, value: unknown): void {
  stream.write(`${JSON.stringify(value, null, 2)}\n`);
}

function sourceSha256(sourcePath: string): string {
  return createHash("sha256").update(readFileSync(sourcePath)).digest("hex");
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
    "  validate <path> [--json]",
    "  render <path> --out <path>",
    "  export <path> --format mermaid [--out <path>]",
    "  export <path> --format d2 [--out <path>]",
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

function sourceFailureToValidationError(
  failure: SourceLoadFailure,
): DiagramSpecValidationError {
  if (failure.kind === "read") {
    return {
      path: "$",
      message: `Unable to read ${failure.path}: ${failure.message}`,
      expected: "Readable DiagramPilot Source File.",
      suggestion: "Check that the source path exists and is readable.",
    };
  }

  const location =
    failure.line === undefined || failure.column === undefined
      ? ""
      : ` at line ${failure.line}, column ${failure.column}`;
  const formatLabel = failure.format.toUpperCase();

  return {
    path: "$",
    message: `${formatLabel} parse error${location}: ${failure.message}`,
    expected: `Valid ${formatLabel} DiagramPilot Source File syntax.`,
    suggestion: `Fix the ${failure.format.toUpperCase()} syntax before semantic validation.`,
  };
}

function hasBadValue(
  error: DiagramSpecValidationError,
): error is DiagramSpecValidationError & { badValue: unknown } {
  return Object.prototype.hasOwnProperty.call(error, "badValue");
}

function formatBadValue(value: unknown): string {
  if (value === undefined) {
    return "<missing>";
  }

  const formatted = JSON.stringify(value);

  return formatted === undefined ? String(value) : formatted;
}

function formatDiagramSpecValidationError(
  filePath: string,
  error: DiagramSpecValidationError,
): string {
  const lines = [
    `DiagramSpec validation error in ${filePath}: ${error.message}`,
    `  Path: ${error.path}`,
    `  Problem: ${error.message}`,
  ];

  if (hasBadValue(error)) {
    lines.push(`  Bad value: ${formatBadValue(error.badValue)}`);
  }

  lines.push(`  Expected: ${error.expected}`);
  lines.push(`  Suggestion: ${error.suggestion}`);

  return lines.join("\n");
}

function parseValidateArgs(args: readonly string[]): ValidateArgsResult {
  let json = false;
  let sourcePath: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown validate option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected validate argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  return {
    ok: true,
    options: {
      json,
      sourcePath,
    },
  };
}

function parseExportArgs(args: readonly string[]): ExportArgsResult {
  let format: string | undefined;
  let outPath: string | undefined;
  let sourcePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--format") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing export format.",
        };
      }

      format = nextArg;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing export output path.",
        };
      }

      outPath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown export option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected export argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  if (format === undefined) {
    return {
      ok: false,
      message: "Missing export format.",
    };
  }

  if (format !== "mermaid" && format !== "d2") {
    return {
      ok: false,
      message: `Unsupported export format: ${format}`,
    };
  }

  return {
    ok: true,
    options: {
      format,
      outPath,
      sourcePath,
    },
  };
}

function parseRenderArgs(args: readonly string[]): RenderArgsResult {
  let outPath: string | undefined;
  let sourcePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--out") {
      const nextArg = args[index + 1];

      if (nextArg === undefined) {
        return {
          ok: false,
          message: "Missing render output path.",
        };
      }

      outPath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown render option: ${arg}`,
      };
    }

    if (sourcePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected render argument: ${arg}`,
      };
    }

    sourcePath = arg;
  }

  if (sourcePath === undefined) {
    return {
      ok: false,
      message: "Missing source path.",
    };
  }

  if (outPath === undefined) {
    return {
      ok: false,
      message: "Missing render output path.",
    };
  }

  return {
    ok: true,
    options: {
      outPath,
      sourcePath,
    },
  };
}

function writeStructuredValidationResult(
  streams: CliStreams,
  result: StructuredValidationResult,
): void {
  writeJsonLine(streams.stdout, result);
}

function runValidate(args: readonly string[], streams: CliStreams): number {
  const argsResult = parseValidateArgs(args);

  if (!argsResult.ok) {
    writeLine(streams.stderr, argsResult.message);
    writeLine(streams.stderr, "Usage: diagrampilot validate <path> [--json]");
    return 1;
  }

  const { json, sourcePath } = argsResult.options;
  const result = loadDiagramPilotSourceFile(sourcePath);

  if (!result.ok) {
    if (json) {
      writeStructuredValidationResult(streams, {
        file: result.failure.path,
        ok: false,
        errors: [sourceFailureToValidationError(result.failure)],
      });
      return 1;
    }

    writeLine(streams.stderr, formatSourceFailure(result.failure));
    return 1;
  }

  const validation = validateDiagramSpec(result.source.value);

  if (!validation.ok) {
    if (json) {
      writeStructuredValidationResult(streams, {
        file: result.source.path,
        ok: false,
        errors: validation.errors,
      });
      return 1;
    }

    for (const error of validation.errors) {
      writeLine(
        streams.stderr,
        formatDiagramSpecValidationError(result.source.path, error),
      );
    }

    return 1;
  }

  if (json) {
    writeStructuredValidationResult(streams, {
      file: result.source.path,
      ok: true,
      errors: [],
    });
    return 0;
  }

  writeLine(streams.stdout, `Valid ${result.source.path}`);
  return 0;
}

function runExport(args: readonly string[], streams: CliStreams): number {
  const argsResult = parseExportArgs(args);

  if (!argsResult.ok) {
    writeLine(streams.stderr, argsResult.message);
    writeLine(
      streams.stderr,
      [
        "Usage:",
        "  diagrampilot export <path> --format mermaid [--out <path>]",
        "  diagrampilot export <path> --format d2 [--out <path>]",
      ].join("\n"),
    );
    return 1;
  }

  const result = loadDiagramPilotSourceFile(argsResult.options.sourcePath);

  if (!result.ok) {
    writeLine(streams.stderr, formatSourceFailure(result.failure));
    return 1;
  }

  const validation = validateDiagramSpec(result.source.value);

  if (!validation.ok) {
    for (const error of validation.errors) {
      writeLine(
        streams.stderr,
        formatDiagramSpecValidationError(result.source.path, error),
      );
    }

    return 1;
  }

  const spec = result.source.value as DiagramSpec;

  if (argsResult.options.format === "mermaid") {
    const exportedText = exportDiagramSpecToMermaid(spec);

    if (argsResult.options.outPath !== undefined) {
      mkdirSync(path.dirname(argsResult.options.outPath), { recursive: true });
      writeFileSync(argsResult.options.outPath, exportedText, "utf8");
      return 0;
    }

    streams.stdout.write(exportedText);
    return 0;
  }

  const exportedText = exportDiagramSpecToD2(spec);

  if (argsResult.options.outPath !== undefined) {
    mkdirSync(path.dirname(argsResult.options.outPath), { recursive: true });
    writeFileSync(argsResult.options.outPath, exportedText, "utf8");
    return 0;
  }

  streams.stdout.write(exportedText);
  return 0;
}

async function runRender(
  args: readonly string[],
  streams: CliStreams,
): Promise<number> {
  const argsResult = parseRenderArgs(args);

  if (!argsResult.ok) {
    writeLine(streams.stderr, argsResult.message);
    writeLine(
      streams.stderr,
      "Usage: diagrampilot render <path> --out <path>",
    );
    return 1;
  }

  const result = loadDiagramPilotSourceFile(argsResult.options.sourcePath);

  if (!result.ok) {
    writeLine(streams.stderr, formatSourceFailure(result.failure));
    return 1;
  }

  const validation = validateDiagramSpec(result.source.value);

  if (!validation.ok) {
    for (const error of validation.errors) {
      writeLine(
        streams.stderr,
        formatDiagramSpecValidationError(result.source.path, error),
      );
    }

    return 1;
  }

  const spec = result.source.value as DiagramSpec;

  try {
    const renderedSvg = await renderDiagramSpecToSvg(spec, {
      provenance: {
        sourcePath: result.source.path,
        sourceSha256: sourceSha256(result.source.path),
        diagramPilotVersion: getDiagramPilotVersion(),
        renderer: {
          name: SVG_RENDERER_NAME,
          version: SVG_RENDERER_VERSION,
        },
      },
    });

    mkdirSync(path.dirname(argsResult.options.outPath), { recursive: true });
    writeFileSync(argsResult.options.outPath, renderedSvg, "utf8");
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to render SVG.";

    writeLine(streams.stderr, `Unable to render ${result.source.path}: ${message}`);
    return 1;
  }
}

export async function run(
  args: readonly string[],
  streams: CliStreams,
): Promise<number> {
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

  if (firstArg === "render") {
    return await runRender(args.slice(1), streams);
  }

  if (firstArg === "export") {
    return runExport(args.slice(1), streams);
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
  process.exitCode = await run(process.argv.slice(2), {
    stdout: process.stdout,
    stderr: process.stderr,
  });
}
