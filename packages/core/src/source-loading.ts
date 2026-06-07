import { readFileSync } from "node:fs";

import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

import type { DiagramSpec } from "./diagramspec-topology.js";
import {
  validateDiagramSpec,
  type DiagramSpecValidationError,
  type RepairableDiagnostic,
} from "./diagramspec-validation.js";

export type DiagramPilotSourceFormat = "yaml" | "json";

export interface DiagramPilotSourceFile {
  format: DiagramPilotSourceFormat;
  path: string;
  content: string;
  value: unknown;
}

export interface RepairableDiagnosticReport {
  file: string;
  errors: RepairableDiagnostic[];
  text: string;
}

export interface SourceParseFailure {
  kind: "parse";
  format: DiagramPilotSourceFormat;
  path: string;
  message: string;
  line?: number;
  column?: number;
}

export interface SourceReadFailure {
  kind: "read";
  path: string;
  message: string;
}

export interface SourceUnsupportedFormatFailure {
  kind: "unsupported-source-format";
  path: string;
  message: string;
}

export type SourceLoadFailure =
  | SourceParseFailure
  | SourceReadFailure
  | SourceUnsupportedFormatFailure;

export type SourceLoadResult =
  | {
      ok: true;
      source: DiagramPilotSourceFile;
    }
  | {
      ok: false;
      failure: SourceLoadFailure;
    };

export type ValidatedDiagramSpecLoadFailure =
  | SourceLoadFailure
  | {
      kind: "validation";
      source: DiagramPilotSourceFile;
      errors: DiagramSpecValidationError[];
    };

export type ValidatedDiagramSpecLoadResult =
  | {
      ok: true;
      source: DiagramPilotSourceFile;
      spec: DiagramSpec;
    }
  | {
      ok: false;
      failure: ValidatedDiagramSpecLoadFailure;
    };

function formatSourceFailure(failure: SourceLoadFailure): string {
  if (failure.kind === "read") {
    return `Unable to read ${failure.path}: ${failure.message}`;
  }

  if (failure.kind === "unsupported-source-format") {
    return failure.message;
  }

  const location =
    failure.line === undefined || failure.column === undefined
      ? ""
      : ` at line ${failure.line}, column ${failure.column}`;
  const formatLabel = failure.format.toUpperCase();

  return `${formatLabel} parse error in ${failure.path}${location}: ${failure.message}`;
}

function sourceFailureToRepairableDiagnostic(
  failure: SourceLoadFailure,
): RepairableDiagnostic {
  if (failure.kind === "read") {
    return {
      path: "$",
      message: `Unable to read ${failure.path}: ${failure.message}`,
      expected: "Readable DiagramPilot Source File.",
      suggestion: "Check that the source path exists and is readable.",
    };
  }

  if (failure.kind === "unsupported-source-format") {
    return {
      path: "$",
      message: failure.message,
      expected: "YAML DiagramPilot Source File syntax.",
      suggestion: "Use a `*.dp.yaml` DiagramPilot Source File.",
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
  error: RepairableDiagnostic,
): error is RepairableDiagnostic & { badValue: unknown } {
  return Object.prototype.hasOwnProperty.call(error, "badValue");
}

function formatBadValue(value: unknown): string {
  if (value === undefined) {
    return "<missing>";
  }

  const formatted = JSON.stringify(value);

  return formatted === undefined ? String(value) : formatted;
}

function formatRepairableDiagnostic(
  filePath: string,
  error: RepairableDiagnostic,
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

export function createRepairableDiagnosticReport(
  failure: ValidatedDiagramSpecLoadFailure,
): RepairableDiagnosticReport {
  if (failure.kind !== "validation") {
    return {
      file: failure.path,
      errors: [sourceFailureToRepairableDiagnostic(failure)],
      text: formatSourceFailure(failure),
    };
  }

  return {
    file: failure.source.path,
    errors: failure.errors,
    text: failure.errors
      .map((error) => formatRepairableDiagnostic(failure.source.path, error))
      .join("\n"),
  };
}

function firstLinePosition(error: YAMLError): { line?: number; column?: number } {
  const [linePosition] = error.linePos ?? [];

  return {
    line: linePosition?.line,
    column: linePosition?.col,
  };
}

function parseYamlSource(path: string, content: string): SourceLoadResult {
  const lineCounter = new LineCounter();
  const document = parseDocument(content, {
    lineCounter,
    prettyErrors: false,
  });
  const [firstError] = document.errors;

  if (firstError !== undefined) {
    const { line, column } = firstLinePosition(firstError);

    return {
      ok: false,
      failure: {
        kind: "parse",
        format: "yaml",
        path,
        message: firstError.message,
        line,
        column,
      },
    };
  }

  return {
    ok: true,
    source: {
      format: "yaml",
      path,
      content,
      value: document.toJS(),
    },
  };
}

function jsonErrorPosition(message: string): { line?: number; column?: number } {
  const match = /\(line (?<line>\d+) column (?<column>\d+)\)$/.exec(message);

  if (match?.groups === undefined) {
    return {};
  }

  return {
    line: Number(match.groups.line),
    column: Number(match.groups.column),
  };
}

function parseJsonSource(path: string, content: string): SourceLoadResult {
  try {
    return {
      ok: true,
      source: {
        format: "json",
        path,
        content,
        value: JSON.parse(content),
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to parse JSON.";
    const { line, column } = jsonErrorPosition(message);

    return {
      ok: false,
      failure: {
        kind: "parse",
        format: "json",
        path,
        message,
        line,
        column,
      },
    };
  }
}

export function loadDiagramPilotSourceFile(path: string): SourceLoadResult {
  let content: string;

  try {
    content = readFileSync(path, "utf8");
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: "read",
        path,
        message: error instanceof Error ? error.message : "Unable to read file.",
      },
    };
  }

  if (path.toLowerCase().endsWith(".dp.json")) {
    return {
      ok: false,
      failure: {
        kind: "unsupported-source-format",
        path,
        message: `Unsupported DiagramPilot source file: ${path}. YAML is the supported source format; use a *.dp.yaml source file.`,
      },
    };
  }

  if (path.toLowerCase().endsWith(".json")) {
    return parseJsonSource(path, content);
  }

  return parseYamlSource(path, content);
}

export function loadValidatedDiagramSpec(
  path: string,
): ValidatedDiagramSpecLoadResult {
  const sourceResult = loadDiagramPilotSourceFile(path);

  if (!sourceResult.ok) {
    return {
      ok: false,
      failure: sourceResult.failure,
    };
  }

  const validation = validateDiagramSpec(sourceResult.source.value);

  if (!validation.ok) {
    return {
      ok: false,
      failure: {
        kind: "validation",
        source: sourceResult.source,
        errors: validation.errors,
      },
    };
  }

  return {
    ok: true,
    source: sourceResult.source,
    spec: sourceResult.source.value as DiagramSpec,
  };
}
