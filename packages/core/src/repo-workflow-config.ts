import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import path from "node:path";

import { LineCounter, parseDocument } from "yaml";
import type { YAMLError } from "yaml";

import type { RepairableDiagnostic } from "./diagramspec-validation.js";

export const repoWorkflowConfigFileName = "diagrampilot.config.yaml";

export interface RepoWorkflowConfig {
  path: string;
  directory: string;
  version: 1;
  sources: {
    ignore: readonly string[];
  };
}

export interface RepoWorkflowConfigFailure {
  kind: "invalid-config";
  path: string;
  message: string;
  errors: readonly RepairableDiagnostic[];
}

export type RepoWorkflowConfigDiscoveryResult =
  | {
      ok: true;
      config?: RepoWorkflowConfig;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    };

function normalizePathForConfig(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function firstLinePosition(error: YAMLError): { line?: number; column?: number } {
  const [linePosition] = error.linePos ?? [];

  return {
    line: linePosition?.line,
    column: linePosition?.col,
  };
}

function diagnosticText(
  configPath: string,
  diagnostic: RepairableDiagnostic,
): string {
  return [
    `Repo Workflow Configuration error in ${configPath}: ${diagnostic.message}`,
    `  Path: ${diagnostic.path}`,
    `  Problem: ${diagnostic.message}`,
    `  Expected: ${diagnostic.expected}`,
    `  Suggestion: ${diagnostic.suggestion}`,
  ].join("\n");
}

function invalidConfig(
  configPath: string,
  diagnostic: RepairableDiagnostic,
): RepoWorkflowConfigDiscoveryResult {
  return {
    ok: false,
    failure: {
      kind: "invalid-config",
      path: configPath,
      message: diagnosticText(configPath, diagnostic),
      errors: [diagnostic],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbsoluteConfigPath(value: string): boolean {
  return path.posix.isAbsolute(value) || path.win32.isAbsolute(value);
}

function leavesConfigTree(value: string): boolean {
  return normalizePathForConfig(value).split("/").includes("..");
}

function validateIgnorePattern(
  configPath: string,
  pattern: unknown,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const diagnosticPath = `sources.ignore[${index}]`;

  if (typeof pattern !== "string" || pattern.trim() === "") {
    return invalidConfig(configPath, {
      path: diagnosticPath,
      message: "Source ignore patterns must be non-empty strings.",
      expected: "A gitignore-style path relative to the config directory.",
      suggestion: "Use a relative pattern such as `generated/**`.",
      badValue: pattern,
    });
  }

  if (isAbsoluteConfigPath(pattern)) {
    return invalidConfig(configPath, {
      path: diagnosticPath,
      message: "Source ignore patterns must be relative paths.",
      expected: "A gitignore-style path relative to the config directory.",
      suggestion: "Remove the leading slash or drive prefix from the pattern.",
      badValue: pattern,
    });
  }

  if (leavesConfigTree(pattern)) {
    return invalidConfig(configPath, {
      path: diagnosticPath,
      message: "Source ignore patterns must stay within the config directory tree.",
      expected: "A path that does not include `..` segments.",
      suggestion: "Use a pattern rooted inside the configured repository tree.",
      badValue: pattern,
    });
  }

  return undefined;
}

function parseRepoWorkflowConfig(
  configPath: string,
): RepoWorkflowConfigDiscoveryResult {
  let content: string;

  try {
    content = readFileSync(configPath, "utf8");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read config.";

    return invalidConfig(configPath, {
      path: "$",
      message: `Unable to read Repo Workflow Configuration: ${message}`,
      expected: "Readable Repo Workflow Configuration.",
      suggestion: "Check that the config file exists and is readable.",
    });
  }

  const lineCounter = new LineCounter();
  const document = parseDocument(content, {
    lineCounter,
    prettyErrors: false,
  });
  const [firstError] = document.errors;

  if (firstError !== undefined) {
    const { line, column } = firstLinePosition(firstError);
    const location =
      line === undefined || column === undefined
        ? ""
        : ` at line ${line}, column ${column}`;

    return invalidConfig(configPath, {
      path: "$",
      message: `YAML parse error${location}: ${firstError.message}`,
      expected: "Valid YAML Repo Workflow Configuration syntax.",
      suggestion: "Fix the YAML syntax before running repo workflow commands.",
    });
  }

  const value = document.toJS();

  if (!isRecord(value)) {
    return invalidConfig(configPath, {
      path: "$",
      message: "Repo Workflow Configuration must be a YAML object.",
      expected: "Top-level object with `version: 1`.",
      suggestion: "Replace the file with `version: 1`.",
      badValue: value,
    });
  }

  if (value.version !== 1) {
    return invalidConfig(configPath, {
      path: "version",
      message: "Repo Workflow Configuration requires top-level `version: 1`.",
      expected: "version: 1",
      suggestion: "Set the top-level config version to `1`.",
      badValue: value.version,
    });
  }

  for (const fieldName of Object.keys(value)) {
    if (fieldName !== "version" && fieldName !== "sources") {
      return invalidConfig(configPath, {
        path: fieldName,
        message: `Unsupported Repo Workflow Configuration field: ${fieldName}.`,
        expected: "Supported top-level fields: version, sources.",
        suggestion: "Remove the unsupported field or upgrade DiagramPilot when that config feature ships.",
        badValue: value[fieldName],
      });
    }
  }

  let ignoredSourcePatterns: readonly string[] = [];

  if (value.sources !== undefined) {
    if (!isRecord(value.sources)) {
      return invalidConfig(configPath, {
        path: "sources",
        message: "`sources` must be a YAML object when provided.",
        expected: "`sources.ignore` as an optional list of relative patterns.",
        suggestion: "Use `sources:\\n  ignore:\\n    - generated/**`.",
        badValue: value.sources,
      });
    }

    for (const fieldName of Object.keys(value.sources)) {
      if (fieldName !== "ignore") {
        return invalidConfig(configPath, {
          path: `sources.${fieldName}`,
          message: `Unsupported Repo Workflow Configuration field: sources.${fieldName}.`,
          expected: "Supported sources fields: ignore.",
          suggestion: "Remove the unsupported field or upgrade DiagramPilot when that config feature ships.",
          badValue: value.sources[fieldName],
        });
      }
    }

    const ignoreValue = value.sources.ignore;

    if (ignoreValue !== undefined) {
      if (!Array.isArray(ignoreValue)) {
        return invalidConfig(configPath, {
          path: "sources.ignore",
          message: "`sources.ignore` must be a list.",
          expected: "A list of gitignore-style paths relative to the config directory.",
          suggestion: "Use `sources:\\n  ignore:\\n    - generated/**`.",
          badValue: ignoreValue,
        });
      }

      for (const [index, pattern] of ignoreValue.entries()) {
        const failure = validateIgnorePattern(configPath, pattern, index);

        if (failure !== undefined) {
          return failure;
        }
      }

      ignoredSourcePatterns = ignoreValue;
    }
  }

  return {
    ok: true,
    config: {
      path: configPath,
      directory: path.dirname(configPath),
      version: 1,
      sources: {
        ignore: ignoredSourcePatterns,
      },
    },
  };
}

function configSearchStartDirectory(scopePath?: string): string {
  if (scopePath === undefined) {
    return process.cwd();
  }

  try {
    const stat = statSync(scopePath);

    return stat.isFile() ? path.dirname(scopePath) : scopePath;
  } catch {
    return path.dirname(path.resolve(scopePath));
  }
}

export async function discoverRepoWorkflowConfig(
  scopePath?: string,
): Promise<RepoWorkflowConfigDiscoveryResult> {
  let directory = path.resolve(configSearchStartDirectory(scopePath));

  while (true) {
    const configPath = path.join(directory, repoWorkflowConfigFileName);

    if (existsSync(configPath)) {
      return parseRepoWorkflowConfig(configPath);
    }

    if (existsSync(path.join(directory, ".git"))) {
      return {
        ok: true,
      };
    }

    const parentDirectory = path.dirname(directory);

    if (parentDirectory === directory) {
      return {
        ok: true,
      };
    }

    directory = parentDirectory;
  }
}
