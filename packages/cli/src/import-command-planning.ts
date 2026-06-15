import {
  importMermaidDiagram,
  serializeDiagramPilotSourceFile,
  type ImportFidelityDiagnostic,
  type ImportFidelityKind,
} from "@diagrampilot/core";

import {
  importUsageText,
  jsonTextLine,
  textLine,
} from "./cli-output.js";
import type { CommandPlanningDependencies } from "./command-planning-dependencies.js";
import { usageFailurePlan } from "./source-command-planning.js";
import type { CommandPlan } from "./types.js";

interface ImportCommandOptions {
  inputPath: string;
  format: "mermaid";
  outPath: string;
  force: boolean;
  json: boolean;
}

type ImportArgsResult =
  | {
      ok: true;
      options: ImportCommandOptions;
    }
  | {
      ok: false;
      message: string;
    };

type MutableImportArgs = {
  inputPath?: string;
  format?: string;
  outPath?: string;
  force: boolean;
  json: boolean;
};

type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };
type FlagParseResult = { ok: true; consumed: number } | { ok: false; message: string };
type BooleanImportFlag = "--force" | "--json";
type BooleanImportProperty = "force" | "json";
type ValueImportFlag = "--format" | "--out";

const booleanImportFlags: Readonly<Record<BooleanImportFlag, BooleanImportProperty>> = {
  "--force": "force",
  "--json": "json",
};

const valueImportFlags: Readonly<
  Record<
    ValueImportFlag,
    {
      property: "format" | "outPath";
      missingMessage: string;
    }
  >
> = {
  "--format": {
    property: "format",
    missingMessage: "Missing import format.",
  },
  "--out": {
    property: "outPath",
    missingMessage: "Missing import output path.",
  },
};

function isBooleanImportFlag(arg: string): arg is BooleanImportFlag {
  return arg in booleanImportFlags;
}

function isValueImportFlag(arg: string): arg is ValueImportFlag {
  return arg in valueImportFlags;
}

function requireFlagValue(
  args: readonly string[],
  index: number,
  missingMessage: string,
): ParseResult<string> {
  const value = args[index + 1];

  return value === undefined
    ? { ok: false, message: missingMessage }
    : { ok: true, value };
}

function parseImportFlag(
  args: readonly string[],
  index: number,
  state: MutableImportArgs,
): FlagParseResult {
  const arg = args[index];

  if (isBooleanImportFlag(arg)) {
    state[booleanImportFlags[arg]] = true;
    return { ok: true, consumed: 1 };
  }

  if (isValueImportFlag(arg)) {
    const flag = valueImportFlags[arg];
    const value = requireFlagValue(args, index, flag.missingMessage);
    if (!value.ok) return value;
    state[flag.property] = value.value;
    return { ok: true, consumed: 2 };
  }

  return { ok: false, message: `Unknown import option: ${arg}` };
}

function parseImportTokens(
  args: readonly string[],
  state: MutableImportArgs,
): { ok: true } | { ok: false; message: string } {
  let index = 0;
  while (index < args.length) {
    const token = parseImportToken(args, index, state);
    if (!token.ok) return token;
    index += token.consumed;
  }

  return { ok: true };
}

function parseImportToken(
  args: readonly string[],
  index: number,
  state: MutableImportArgs,
): FlagParseResult {
  const arg = args[index];
  return arg.startsWith("-")
    ? parseImportFlag(args, index, state)
    : parseImportInputPath(arg, state);
}

function parseImportInputPath(
  arg: string,
  state: MutableImportArgs,
): FlagParseResult {
  if (state.inputPath !== undefined) {
    return { ok: false, message: `Unexpected import argument: ${arg}` };
  }

  state.inputPath = arg;
  return { ok: true, consumed: 1 };
}

function createMutableImportArgs(): MutableImportArgs {
  return {
    force: false,
    json: false,
  };
}

function requireImportInput(state: MutableImportArgs): ParseResult<string> {
  return state.inputPath === undefined
    ? { ok: false, message: "Missing import input path." }
    : { ok: true, value: state.inputPath };
}

function requireImportFormat(
  state: MutableImportArgs,
): ParseResult<ImportCommandOptions["format"]> {
  if (state.format === undefined) {
    return { ok: false, message: "Missing import format." };
  }

  return state.format === "mermaid"
    ? { ok: true, value: state.format }
    : { ok: false, message: `Unsupported import format: ${state.format}` };
}

function requireImportOutput(state: MutableImportArgs): ParseResult<string> {
  if (state.outPath === undefined) {
    return { ok: false, message: "Missing import output path." };
  }

  return state.outPath.endsWith(".dp.yaml")
    ? { ok: true, value: state.outPath }
    : { ok: false, message: "Import output path must end with .dp.yaml." };
}

function completeImportOptions(state: MutableImportArgs): ImportArgsResult {
  const inputPath = requireImportInput(state);
  if (!inputPath.ok) return inputPath;

  const format = requireImportFormat(state);
  if (!format.ok) return format;

  const outPath = requireImportOutput(state);
  if (!outPath.ok) return outPath;

  return {
    ok: true,
    options: {
      inputPath: inputPath.value,
      format: format.value,
      outPath: outPath.value,
      force: state.force,
      json: state.json,
    },
  };
}

function parseImportArgs(args: readonly string[]): ImportArgsResult {
  const state = createMutableImportArgs();
  const parsed = parseImportTokens(args, state);
  return parsed.ok ? completeImportOptions(state) : parsed;
}

function decodeInputContent(content: string | Uint8Array): string {
  return typeof content === "string" ? content : new TextDecoder().decode(content);
}

function readInputText(
  inputPath: string,
  dependencies: CommandPlanningDependencies,
): { ok: true; content: string } | { ok: false; message: string } {
  try {
    return {
      ok: true,
      content: decodeInputContent(dependencies.readSourceContent(inputPath)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read input.";
    return {
      ok: false,
      message: `Unable to read import input ${inputPath}: ${message}`,
    };
  }
}

function formatFidelityItems(
  diagnostics: readonly ImportFidelityDiagnostic[],
  kind: ImportFidelityKind,
): string[] {
  const items = diagnostics.filter((diagnostic) => diagnostic.kind === kind);
  const heading = {
    preserved: "Preserved:",
    approximated: "Approximated:",
    dropped: "Dropped:",
  }[kind];

  if (items.length === 0) return [`${heading} 0`];

  return [
    heading,
    ...items.map((item) => `- ${item.construct}: ${item.message}`),
  ];
}

function importTextOutput(
  options: ImportCommandOptions,
  diagnostics: readonly ImportFidelityDiagnostic[],
): string {
  return [
    `Imported ${options.inputPath} to ${options.outPath}.`,
    "Fidelity summary:",
    ...formatFidelityItems(diagnostics, "preserved"),
    ...formatFidelityItems(diagnostics, "approximated"),
    ...formatFidelityItems(diagnostics, "dropped"),
    `Next: diagrampilot validate ${options.outPath}`,
    "",
  ].join("\n");
}

function importJsonOutput(
  options: ImportCommandOptions,
  spec: unknown,
  fidelity: unknown,
): string {
  return jsonTextLine({
    ok: true,
    format: options.format,
    input: options.inputPath,
    output: options.outPath,
    spec,
    fidelity,
  });
}

function importFailurePlan(message: string, json: boolean): CommandPlan {
  if (json) {
    return {
      exitCode: 1,
      stdout: jsonTextLine({
        ok: false,
        error: message,
      }),
      stderr: "",
      writes: [],
    };
  }

  return {
    exitCode: 1,
    stdout: "",
    stderr: textLine(message),
    writes: [],
  };
}

function importOverwriteFailurePlan(options: ImportCommandOptions): CommandPlan {
  return importFailurePlan(
    [
      `DiagramPilot Source File already exists: ${options.outPath}`,
      "Suggestion: choose a new output path or rerun import with --force.",
    ].join("\n"),
    options.json,
  );
}

export function planImport(
  args: readonly string[],
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const argsResult = parseImportArgs(args);

  if (!argsResult.ok) {
    return usageFailurePlan(argsResult.message, importUsageText());
  }

  return createImportPlan(argsResult.options, dependencies);
}

function createImportPlan(
  options: ImportCommandOptions,
  dependencies: CommandPlanningDependencies,
): CommandPlan {
  const preflightFailure = importPreflightFailurePlan(options, dependencies);
  if (preflightFailure !== undefined) return preflightFailure;

  const input = readInputText(options.inputPath, dependencies);
  if (!input.ok) return importFailurePlan(input.message, options.json);

  return importContentPlan(options, input.content);
}

function importPreflightFailurePlan(
  options: ImportCommandOptions,
  dependencies: CommandPlanningDependencies,
): CommandPlan | undefined {
  return !options.force && dependencies.pathExists?.(options.outPath) === true
    ? importOverwriteFailurePlan(options)
    : undefined;
}

function importContentPlan(
  options: ImportCommandOptions,
  inputContent: string,
): CommandPlan {
  const imported = importMermaidDiagram(inputContent);
  if (!imported.ok) return importFailurePlan(imported.message, options.json);

  const content = serializeDiagramPilotSourceFile(imported.spec);
  return {
    exitCode: 0,
    stdout: options.json
      ? importJsonOutput(options, imported.spec, imported.fidelity)
      : importTextOutput(options, imported.fidelity.diagnostics),
    stderr: "",
    writes: [
      {
        path: options.outPath,
        content,
      },
    ],
  };
}
