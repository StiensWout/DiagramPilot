import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

export interface YamlErrorPosition {
  line?: number;
  column?: number;
}

export interface ParsedYamlDocument {
  document: ReturnType<typeof parseDocument>;
  firstError?: YAMLError;
  firstErrorPosition: YamlErrorPosition;
}

function firstLinePosition(error: YAMLError | undefined): YamlErrorPosition {
  if (error === undefined) return {};

  const [linePosition] = error.linePos ?? [];

  return linePosition === undefined
    ? {}
    : {
        line: linePosition.line,
        column: linePosition.col,
      };
}

export function parseYamlDocument(content: string): ParsedYamlDocument {
  const lineCounter = new LineCounter();
  const document = parseDocument(content, {
    lineCounter,
    prettyErrors: false,
  });
  const [firstError] = document.errors;

  return {
    document,
    firstError,
    firstErrorPosition: firstLinePosition(firstError),
  };
}
