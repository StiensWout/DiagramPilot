import { readFileSync } from "node:fs";

import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

export const DIAGRAMPILOT_VERSION = "0.1.0";

export function getDiagramPilotVersion(): string {
  return DIAGRAMPILOT_VERSION;
}

export type DiagramPilotSourceFormat = "yaml" | "json";

export interface DiagramPilotSourceFile {
  format: DiagramPilotSourceFormat;
  path: string;
  value: unknown;
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
