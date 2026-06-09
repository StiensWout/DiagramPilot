import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { RepairableDiagnostic } from "./diagramspec-validation.js";
import {
  invalidConfig,
  isRecord,
  validateArtifactMapping,
  validateIgnorePattern,
} from "./repo-workflow-config-validation.js";
import { parseYamlDocument } from "./yaml-parse.js";

const repoWorkflowConfigFileName = "diagrampilot.config.yaml";

export type RepoWorkflowArtifactOutputFormat =
  | "svg" | "png" | "mermaid" | "d2" | "dot" | "markdown";

export interface RepoWorkflowArtifactOutput {
  format: RepoWorkflowArtifactOutputFormat;
  path: string;
}

export interface RepoWorkflowArtifactMapping {
  source?: string;
  sourceGlob?: string;
  outputs: readonly RepoWorkflowArtifactOutput[];
}

export interface RepoWorkflowConfig {
  path: string;
  directory: string;
  version: 1;
  sources: {
    ignore: readonly string[];
  };
  artifacts: readonly RepoWorkflowArtifactMapping[];
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

function invalidConfigFailure(
  configPath: string,
  diagnostic: RepairableDiagnostic,
): RepoWorkflowConfigFailure {
  const result = invalidConfig(configPath, diagnostic);

  if (result.ok) {
    throw new Error("Expected invalid Repo Workflow Configuration result.");
  }

  return result.failure;
}

function readRepoWorkflowConfigContent(configPath: string):
  | {
      ok: true;
      content: string;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  try {
    return {
      ok: true,
      content: readFileSync(configPath, "utf8"),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read config.";

    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: "$",
        message: `Unable to read Repo Workflow Configuration: ${message}`,
        expected: "Readable Repo Workflow Configuration.",
        suggestion: "Check that the config file exists and is readable.",
      }),
    };
  }
}

function parseRepoWorkflowConfigValue(configPath: string, content: string):
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  const { document, firstError, firstErrorPosition } = parseYamlDocument(content);

  if (firstError === undefined) {
    return {
      ok: true,
      value: document.toJS(),
    };
  }

  const { line, column } = firstErrorPosition;
  const location =
    line === undefined || column === undefined
      ? ""
      : ` at line ${line}, column ${column}`;

  return {
    ok: false,
    failure: invalidConfigFailure(configPath, {
      path: "$",
      message: `YAML parse error${location}: ${firstError.message}`,
      expected: "Valid YAML Repo Workflow Configuration syntax.",
      suggestion: "Fix the YAML syntax before running repo workflow commands.",
    }),
  };
}

function validateRepoWorkflowConfigRoot(configPath: string, value: unknown):
  | {
      ok: true;
      value: Record<string, unknown>;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  if (!isRecord(value)) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: "$",
        message: "Repo Workflow Configuration must be a YAML object.",
        expected: "Top-level object with `version: 1`.",
        suggestion: "Replace the file with `version: 1`.",
        badValue: value,
      }),
    };
  }

  if (value.version !== 1) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: "version",
        message: "Repo Workflow Configuration requires top-level `version: 1`.",
        expected: "version: 1",
        suggestion: "Set the top-level config version to `1`.",
        badValue: value.version,
      }),
    };
  }

  const supportedFields = new Set(["version", "sources", "artifacts"]);
  const unsupportedField = Object.keys(value).find(
    (fieldName) => !supportedFields.has(fieldName),
  );

  if (unsupportedField !== undefined) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: unsupportedField,
        message: `Unsupported Repo Workflow Configuration field: ${unsupportedField}.`,
        expected: "Supported top-level fields: version, sources, artifacts.",
        suggestion: "Remove the unsupported field or upgrade DiagramPilot when that config feature ships.",
        badValue: value[unsupportedField],
      }),
    };
  }

  return {
    ok: true,
    value,
  };
}

function validateSourcesObject(configPath: string, value: Record<string, unknown>):
  | {
      ok: true;
      sources: Record<string, unknown> | undefined;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  if (value.sources === undefined) {
    return {
      ok: true,
      sources: undefined,
    };
  }

  if (!isRecord(value.sources)) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: "sources",
        message: "`sources` must be a YAML object when provided.",
        expected: "`sources.ignore` as an optional list of relative patterns.",
        suggestion: "Use `sources:\\n  ignore:\\n    - generated/**`.",
        badValue: value.sources,
      }),
    };
  }

  const unsupportedField = Object.keys(value.sources).find(
    (fieldName) => fieldName !== "ignore",
  );

  if (unsupportedField !== undefined) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: `sources.${unsupportedField}`,
        message: `Unsupported Repo Workflow Configuration field: sources.${unsupportedField}.`,
        expected: "Supported sources fields: ignore.",
        suggestion: "Remove the unsupported field or upgrade DiagramPilot when that config feature ships.",
        badValue: value.sources[unsupportedField],
      }),
    };
  }

  return {
    ok: true,
    sources: value.sources,
  };
}

function parseIgnoredSourcePatterns(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  ignore?: readonly string[];
} {
  const sourcesResult = validateSourcesObject(configPath, value);

  if (!sourcesResult.ok) {
    return sourcesResult;
  }

  const ignoreValue = sourcesResult.sources?.ignore;

  if (ignoreValue === undefined) {
    return {
      ok: true,
      ignore: [],
    };
  }

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

  return {
    ok: true,
    ignore: ignoreValue,
  };
}

function parseArtifactMappings(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  artifacts?: readonly RepoWorkflowArtifactMapping[];
} {
  if (value.artifacts === undefined) {
    return {
      ok: true,
      artifacts: [],
    };
  }

  if (!Array.isArray(value.artifacts)) {
    return invalidConfig(configPath, {
        path: "artifacts",
        message: "`artifacts` must be a list.",
        expected: "A list of configured artifact mappings.",
        suggestion: "Use `artifacts:\\n  - source: docs/architecture.dp.yaml`.",
        badValue: value.artifacts,
    });
  }

  for (const [index, mapping] of value.artifacts.entries()) {
    const failure = validateArtifactMapping(configPath, mapping, index);

    if (failure !== undefined) {
      return failure;
    }
  }

  return {
    ok: true,
    artifacts: value.artifacts as RepoWorkflowArtifactMapping[],
  };
}

function createRepoWorkflowConfigFromRoot(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult {
  const ignoredSourcesResult = parseIgnoredSourcePatterns(configPath, value);

  if (!ignoredSourcesResult.ok) {
    return ignoredSourcesResult;
  }

  const artifactMappingsResult = parseArtifactMappings(configPath, value);

  if (!artifactMappingsResult.ok) {
    return artifactMappingsResult;
  }

  return {
    ok: true,
    config: {
      path: configPath,
      directory: path.dirname(configPath),
      version: 1,
      sources: {
        ignore: ignoredSourcesResult.ignore ?? [],
      },
      artifacts: artifactMappingsResult.artifacts ?? [],
    },
  };
}

function parseRepoWorkflowConfig(
  configPath: string,
): RepoWorkflowConfigDiscoveryResult {
  const contentResult = readRepoWorkflowConfigContent(configPath);

  if (!contentResult.ok) return contentResult;

  const parsedResult = parseRepoWorkflowConfigValue(
    configPath,
    contentResult.content,
  );

  if (!parsedResult.ok) return parsedResult;

  const rootResult = validateRepoWorkflowConfigRoot(
    configPath,
    parsedResult.value,
  );

  return rootResult.ok
    ? createRepoWorkflowConfigFromRoot(configPath, rootResult.value)
    : rootResult;
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
