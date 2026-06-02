import { readFileSync } from "node:fs";

import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

export const DIAGRAMPILOT_VERSION = "0.1.0";

const allowedDirections = ["right", "left", "down", "up"] as const;
const allowedDirectionList = allowedDirections.join(", ");

export function getDiagramPilotVersion(): string {
  return DIAGRAMPILOT_VERSION;
}

export type DiagramPilotSourceFormat = "yaml" | "json";

export interface DiagramPilotSourceFile {
  format: DiagramPilotSourceFormat;
  path: string;
  value: unknown;
}

export interface DiagramSpecValidationError {
  path: string;
  message: string;
  badValue?: unknown;
  expected: string;
  suggestion: string;
}

export type DiagramSpecValidationResult =
  | {
      ok: true;
      errors: [];
    }
  | {
      ok: false;
      errors: DiagramSpecValidationError[];
    };

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

export type SourceLoadFailure = SourceParseFailure | SourceReadFailure;

export type SourceLoadResult =
  | {
      ok: true;
      source: DiagramPilotSourceFile;
    }
  | {
      ok: false;
      failure: SourceLoadFailure;
    };

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

  if (path.toLowerCase().endsWith(".json")) {
    return parseJsonSource(path, content);
  }

  return parseYamlSource(path, content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedDirection(value: unknown): boolean {
  return allowedDirections.some((direction) => direction === value);
}

export function validateDiagramSpec(
  value: unknown,
): DiagramSpecValidationResult {
  const errors: DiagramSpecValidationError[] = [];

  if (!isRecord(value)) {
    errors.push({
      path: "$",
      message: "DiagramSpec must be a top-level object.",
      badValue: value,
      expected: "Object with required top-level fields: version, title, nodes.",
      suggestion:
        "Replace the source contents with a DiagramSpec object containing version, title, and nodes.",
    });

    return { ok: false, errors };
  }

  for (const field of ["version", "title", "nodes"] as const) {
    if (!(field in value)) {
      errors.push({
        path: field,
        message: `Missing required top-level field: ${field}.`,
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: `Add ${field} to the top level of the DiagramSpec.`,
      });
    }
  }

  if (Array.isArray(value.nodes) && value.nodes.length === 0) {
    errors.push({
      path: "nodes",
      message: "nodes must contain at least one node.",
      badValue: value.nodes,
      expected: "nodes with at least one node object.",
      suggestion: "Add at least one node to nodes.",
    });
  }

  if ("direction" in value && !isAllowedDirection(value.direction)) {
    errors.push({
      path: "direction",
      message: `direction must be one of: ${allowedDirectionList}.`,
      badValue: value.direction,
      expected: `One of: ${allowedDirectionList}.`,
      suggestion: "Change direction to right, left, down, or up.",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [] };
}
