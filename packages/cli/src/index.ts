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
  checkDiagramPilotRepoWorkflow,
  createRepairableDiagnosticReport,
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
  type DiagramSpec,
  type ValidatedDiagramSpecLoadResult,
  type RepoWorkflowCheckOptions,
  type RepoWorkflowCheckResult,
  type RepoWorkflowCheckSourceResult,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  type CreateSvgRendererProvenanceOptions,
  type SvgRendererProvenance,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  renderDiagramSpecToSvg,
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

interface CheckCommandOptions {
  json: boolean;
  scopePath?: string;
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

type CheckArgsResult =
  | {
      ok: true;
      options: CheckCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

export interface CommandWriteIntent {
  path: string;
  content: string;
}

export interface CommandPlan {
  exitCode: number;
  stdout: string;
  stderr: string;
  writes: CommandWriteIntent[];
}

export interface CommandPlanningDependencies {
  checkDiagramPilotRepoWorkflow(
    options: RepoWorkflowCheckOptions,
  ): Promise<RepoWorkflowCheckResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  exportDiagramSpecToMermaid(spec: DiagramSpec): string;
  exportDiagramSpecToD2(spec: DiagramSpec): string;
  readSourceContent(path: string): string | Uint8Array;
  renderDiagramSpecToSvg(
    spec: DiagramSpec,
    options: { provenance?: SvgRendererProvenance },
  ): Promise<string>;
  createSvgRendererProvenance(
    options: CreateSvgRendererProvenanceOptions,
  ): SvgRendererProvenance;
  getDiagramPilotVersion(): string;
}

const defaultCommandPlanningDependencies: CommandPlanningDependencies = {
  checkDiagramPilotRepoWorkflow,
  loadValidatedDiagramSpec,
  exportDiagramSpecToMermaid,
  exportDiagramSpecToD2,
  readSourceContent: (sourcePath) => readFileSync(sourcePath),
  renderDiagramSpecToSvg,
  createSvgRendererProvenance,
  getDiagramPilotVersion,
};

function writeLine(stream: Writable, message: string): void {
  stream.write(`${message}\n`);
}

function textLine(message: string): string {
  return `${message}\n`;
}

function jsonTextLine(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function helpText(version = getDiagramPilotVersion()): string {
  return [
    `diagrampilot ${version}`,
    "",
    "Usage:",
    "  diagrampilot --version",
    "  diagrampilot --help",
    "",
    "MVP commands:",
    "  init",
    "  validate <path> [--json]",
    "  check [path] [--json]",
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

function parseCheckArgs(args: readonly string[]): CheckArgsResult {
  let json = false;
  let scopePath: string | undefined;

  for (const arg of args) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg.startsWith("-")) {
      return {
        ok: false,
        message: `Unknown check option: ${arg}`,
      };
    }

    if (scopePath !== undefined) {
      return {
        ok: false,
        message: `Unexpected check argument: ${arg}`,
      };
    }

    scopePath = arg;
  }

  return {
    ok: true,
    options: {
      json,
      scopePath,
    },
  };
}

function checkUsageText(): string {
  return "Usage: diagrampilot check [path] [--json]";
}

function formatSourceCount(count: number): string {
  return `${count} DiagramPilot Source File${count === 1 ? "" : "s"}`;
}

function isArtifactFailure(
  source: RepoWorkflowCheckSourceResult,
): boolean {
  return source.validation.ok === false || source.artifact.status !== "fresh";
}

function isIssueArtifact(
  artifact: RepoWorkflowCheckSourceResult["artifact"],
): artifact is Exclude<
  RepoWorkflowCheckSourceResult["artifact"],
  { status: "fresh" } | { status: "unchecked" }
> {
  return artifact.status !== "fresh" && artifact.status !== "unchecked";
}

function formatCheckTextReport(
  sourceResults: readonly RepoWorkflowCheckSourceResult[],
): string {
  const issueSources = sourceResults.filter(isArtifactFailure);

  if (issueSources.length === 0) {
    return `Checked ${formatSourceCount(sourceResults.length)}. All expected SVG artifacts are fresh.`;
  }

  const lines = [
    `Checked ${formatSourceCount(sourceResults.length)}. Found ${issueSources.length} workflow issues.`,
  ];

  for (const source of issueSources) {
    if (source.validation.ok === false) {
      lines.push(
        `Invalid source: ${source.sourcePath}. Run \`diagrampilot validate ${source.sourcePath}\`.`,
      );
      continue;
    }

    if (!isIssueArtifact(source.artifact)) {
      continue;
    }

    if (source.artifact.status === "missing-artifact") {
      lines.push(
        `Missing SVG artifact: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    if (source.artifact.status === "stale") {
      lines.push(
        `Stale SVG artifact: ${source.artifact.path} for ${source.sourcePath} (${source.artifact.reasons.join(", ")}). Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    if (source.artifact.status === "missing-provenance") {
      lines.push(
        `Missing DiagramPilot provenance: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
      );
      continue;
    }

    const artifactLabel =
      source.artifact.status === "unreadable-artifact"
        ? "Unreadable SVG artifact"
        : "Malformed SVG artifact";
    lines.push(
      `${artifactLabel}: ${source.artifact.path} for ${source.sourcePath}. Run \`diagrampilot render ${source.sourcePath} --out ${source.artifact.path}\`.`,
    );
  }

  return lines.join("\n");
}

function planValidate(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseValidateArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [
        argsResult.message,
        "Usage: diagrampilot validate <path> [--json]",
        "",
      ].join("\n"),
      writes: [],
    };
  }

  const { json, sourcePath } = argsResult.options;
  const result = dependencies.loadValidatedDiagramSpec(sourcePath);

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    if (json) {
      return {
        exitCode: 1,
        stdout: jsonTextLine({
          file: report.file,
          ok: false,
          errors: report.errors,
        }),
        stderr: "",
        writes: [],
      };
    }

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  if (json) {
    return {
      exitCode: 0,
      stdout: jsonTextLine({
        file: result.source.path,
        ok: true,
        errors: [],
      }),
      stderr: "",
      writes: [],
    };
  }

  return {
    exitCode: 0,
    stdout: textLine(`Valid ${result.source.path}`),
    stderr: "",
    writes: [],
  };
}

function exportUsageText(): string {
  return [
    "Usage:",
    "  diagrampilot export <path> --format mermaid [--out <path>]",
    "  diagrampilot export <path> --format d2 [--out <path>]",
  ].join("\n");
}

function planExport(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseExportArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [argsResult.message, exportUsageText(), ""].join("\n"),
      writes: [],
    };
  }

  const result = dependencies.loadValidatedDiagramSpec(
    argsResult.options.sourcePath,
  );

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  const exportedText =
    argsResult.options.format === "mermaid"
      ? dependencies.exportDiagramSpecToMermaid(result.spec)
      : dependencies.exportDiagramSpecToD2(result.spec);

  if (argsResult.options.outPath !== undefined) {
    return {
      exitCode: 0,
      stdout: "",
      stderr: "",
      writes: [
        {
          path: argsResult.options.outPath,
          content: exportedText,
        },
      ],
    };
  }

  return {
    exitCode: 0,
    stdout: exportedText,
    stderr: "",
    writes: [],
  };
}

async function planRender(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseRenderArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [
        argsResult.message,
        "Usage: diagrampilot render <path> --out <path>",
        "",
      ].join("\n"),
      writes: [],
    };
  }

  const result = dependencies.loadValidatedDiagramSpec(
    argsResult.options.sourcePath,
  );

  if (!result.ok) {
    const report = createRepairableDiagnosticReport(result.failure);

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(report.text),
      writes: [],
    };
  }

  try {
    const renderedSvg = await dependencies.renderDiagramSpecToSvg(result.spec, {
      provenance: dependencies.createSvgRendererProvenance({
        sourcePath: result.source.path,
        sourceContent: dependencies.readSourceContent(result.source.path),
      }),
    });

    return {
      exitCode: 0,
      stdout: "",
      stderr: "",
      writes: [
        {
          path: argsResult.options.outPath,
          content: renderedSvg,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to render SVG.";

    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(`Unable to render ${result.source.path}: ${message}`),
      writes: [],
    };
  }
}

async function planCheck(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): Promise<CommandPlan> {
  const argsResult = parseCheckArgs(args);

  if (!argsResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: [argsResult.message, checkUsageText(), ""].join("\n"),
      writes: [],
    };
  }

  const checkResult = await dependencies.checkDiagramPilotRepoWorkflow({
    scopePath: argsResult.options.scopePath,
    diagramPilotVersion: dependencies.getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  });

  if (!checkResult.ok) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: textLine(checkResult.failure.message),
      writes: [],
    };
  }

  if (checkResult.sources.length === 0) {
    if (argsResult.options.json) {
      return {
        exitCode: 0,
        stdout: jsonTextLine(checkResult),
        stderr: "",
        writes: [],
      };
    }

    return {
      exitCode: 0,
      stdout: textLine(
        `No DiagramPilot Source Files found in ${checkResult.scope.path}.`,
      ),
      stderr: "",
      writes: [],
    };
  }

  const sourceResults = checkResult.sources;
  const issueCount = checkResult.summary.issueCount;

  if (argsResult.options.json) {
    return {
      exitCode: issueCount === 0 ? 0 : 1,
      stdout: jsonTextLine({
        ...checkResult,
        ok: issueCount === 0,
      }),
      stderr: "",
      writes: [],
    };
  }

  return {
    exitCode: issueCount === 0 ? 0 : 1,
    stdout: issueCount === 0 ? textLine(formatCheckTextReport(sourceResults)) : "",
    stderr: issueCount === 0 ? "" : textLine(formatCheckTextReport(sourceResults)),
    writes: [],
  };
}

export async function planCommand(
  args: readonly string[],
  dependencies: CommandPlanningDependencies = defaultCommandPlanningDependencies,
): Promise<CommandPlan> {
  const [firstArg] = args;

  if (firstArg === "--version" || firstArg === "-v") {
    return {
      exitCode: 0,
      stdout: textLine(`diagrampilot ${dependencies.getDiagramPilotVersion()}`),
      stderr: "",
      writes: [],
    };
  }

  if (firstArg === undefined || firstArg === "--help" || firstArg === "-h") {
    return {
      exitCode: 0,
      stdout: textLine(helpText(dependencies.getDiagramPilotVersion())),
      stderr: "",
      writes: [],
    };
  }

  if (firstArg === "validate") {
    return planValidate(args.slice(1), dependencies);
  }

  if (firstArg === "export") {
    return planExport(args.slice(1), dependencies);
  }

  if (firstArg === "render") {
    return await planRender(args.slice(1), dependencies);
  }

  if (firstArg === "check") {
    return await planCheck(args.slice(1), dependencies);
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: [
      `Unknown command or option: ${firstArg}`,
      "Run `diagrampilot --help` for usage.",
      "",
    ].join("\n"),
    writes: [],
  };
}

function executeCommandPlan(plan: CommandPlan, streams: CliStreams): number {
  if (plan.stdout !== "") {
    streams.stdout.write(plan.stdout);
  }

  if (plan.stderr !== "") {
    streams.stderr.write(plan.stderr);
  }

  for (const write of plan.writes) {
    mkdirSync(path.dirname(write.path), { recursive: true });
    writeFileSync(write.path, write.content, "utf8");
  }

  return plan.exitCode;
}

export async function run(
  args: readonly string[],
  streams: CliStreams,
): Promise<number> {
  const [firstArg] = args;

  if (firstArg === "init") {
    return runInit(streams);
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
