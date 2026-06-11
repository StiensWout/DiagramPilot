import { readFileSync } from "node:fs";

import type { DiagramSpec } from "./diagramspec-topology.js";
import {
  validateDiagramSpec,
  type DiagramSpecValidationError,
  type RepairableDiagnostic,
} from "./diagramspec-validation.js";
import { parseYamlDocument } from "./yaml-parse.js";

export type DiagramPilotSourceFormat = "yaml";

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

type SourceContentReadResult =
  | {
      ok: true;
      content: string;
    }
  | {
      ok: false;
      failure: SourceReadFailure;
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

function parseFailureLocation(
  failure: Extract<SourceLoadFailure, { kind: "parse" }>,
): string {
  if (failure.line === undefined) {
    return "";
  }

  if (failure.column === undefined) {
    return "";
  }

  return ` at line ${failure.line}, column ${failure.column}`;
}

function parseFailureFormatLabel(
  failure: Extract<SourceLoadFailure, { kind: "parse" }>,
): string {
  return failure.format.toUpperCase();
}

function formatParseSourceFailure(
  failure: Extract<SourceLoadFailure, { kind: "parse" }>,
): string {
  const formatLabel = parseFailureFormatLabel(failure);
  return `${formatLabel} parse error in ${failure.path}${parseFailureLocation(
    failure,
  )}: ${failure.message}`;
}

function formatSourceFailure(failure: SourceLoadFailure): string {
  if (failure.kind === "read") {
    return `Unable to read ${failure.path}: ${failure.message}`;
  }

  if (failure.kind === "unsupported-source-format") {
    return failure.message;
  }

  return formatParseSourceFailure(failure);
}

function readFailureDiagnostic(
  failure: Extract<SourceLoadFailure, { kind: "read" }>,
): RepairableDiagnostic {
  return {
    path: "$",
    message: `Unable to read ${failure.path}: ${failure.message}`,
    expected: "Readable DiagramPilot Source File.",
    suggestion: "Check that the source path exists and is readable.",
  };
}

function unsupportedSourceFormatDiagnostic(
  failure: Extract<SourceLoadFailure, { kind: "unsupported-source-format" }>,
): RepairableDiagnostic {
  return {
    path: "$",
    message: failure.message,
    expected: "YAML DiagramPilot Source File syntax.",
    suggestion: "Use a `*.dp.yaml` DiagramPilot Source File.",
  };
}

function parseFailureDiagnostic(
  failure: Extract<SourceLoadFailure, { kind: "parse" }>,
): RepairableDiagnostic {
  const formatLabel = parseFailureFormatLabel(failure);
  return {
    path: "$",
    message: `${formatLabel} parse error${parseFailureLocation(failure)}: ${
      failure.message
    }`,
    expected: `Valid ${formatLabel} DiagramPilot Source File syntax.`,
    suggestion: `Fix the ${formatLabel} syntax before semantic validation.`,
  };
}

function sourceFailureToRepairableDiagnostic(
  failure: SourceLoadFailure,
): RepairableDiagnostic {
  if (failure.kind === "read") {
    return readFailureDiagnostic(failure);
  }

  if (failure.kind === "unsupported-source-format") {
    return unsupportedSourceFormatDiagnostic(failure);
  }

  return parseFailureDiagnostic(failure);
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

function parseYamlSource(path: string, content: string): SourceLoadResult {
  const { document, firstError, firstErrorPosition } = parseYamlDocument(content);

  if (firstError !== undefined) {
    const { line, column } = firstErrorPosition;

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

function readDiagramPilotSourceContent(
  path: string,
): SourceContentReadResult {
  try {
    return {
      ok: true,
      content: readFileSync(path, "utf8"),
    };
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
}

function unsupportedSourcePathResult(path: string): SourceLoadResult {
  return {
    ok: false,
    failure: {
      kind: "unsupported-source-format",
      path,
      message: `Unsupported DiagramPilot source file: ${path}`,
    },
  };
}

function isDiagramPilotSourcePath(path: string): boolean {
  return path.toLowerCase().endsWith(".dp.yaml");
}

export function loadDiagramPilotSourceFile(path: string): SourceLoadResult {
  if (!isDiagramPilotSourcePath(path)) {
    return unsupportedSourcePathResult(path);
  }

  const contentResult = readDiagramPilotSourceContent(path);

  if (!contentResult.ok) {
    return contentResult;
  }

  return parseYamlSource(path, contentResult.content);
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
