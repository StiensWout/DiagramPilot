import path from "node:path";

import type { RepairableDiagnostic } from "./diagramspec-validation.js";
import { discoverRepoWorkflowConfigWithParser } from "./repo-workflow-config-discovery.js";
import {
  invalidConfigFailure,
  parseRepoWorkflowConfigValue,
  readRepoWorkflowConfigContent,
} from "./repo-workflow-config-file.js";
import {
  invalidConfig,
  isRecord,
  validateArtifactMapping,
  validateIgnorePattern,
} from "./repo-workflow-config-validation.js";

const repoWorkflowConfigFileName = "diagrampilot.config.yaml";

export type RepoWorkflowArtifactOutputFormat =
  | "svg" | "png" | "mermaid" | "d2" | "dot" | "markdown";

export type RepoWorkflowOutputProfile =
  | "clean" | "compact" | "overview" | "presentation";

export interface RepoWorkflowArtifactOutput {
  format: RepoWorkflowArtifactOutputFormat;
  path: string;
  profile?: RepoWorkflowOutputProfile;
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

  return parseSourcesIgnoreList(configPath, sourcesResult.sources?.ignore);
}

function parseSourcesIgnoreList(
  configPath: string,
  ignoreValue: unknown,
): RepoWorkflowConfigDiscoveryResult & {
  ignore?: readonly string[];
} {
  if (ignoreValue === undefined) {
    return {
      ok: true,
      ignore: [],
    };
  }

  if (!Array.isArray(ignoreValue)) {
    return invalidSourcesIgnoreList(configPath, ignoreValue);
  }

  const failure = validateIgnorePatterns(configPath, ignoreValue);

  if (failure !== undefined) {
    return failure;
  }

  return {
    ok: true,
    ignore: ignoreValue,
  };
}

function invalidSourcesIgnoreList(
  configPath: string,
  ignoreValue: unknown,
): RepoWorkflowConfigDiscoveryResult {
  return invalidConfig(configPath, {
    path: "sources.ignore",
    message: "`sources.ignore` must be a list.",
    expected: "A list of gitignore-style paths relative to the config directory.",
    suggestion: "Use `sources:\\n  ignore:\\n    - generated/**`.",
    badValue: ignoreValue,
  });
}

function validateIgnorePatterns(
  configPath: string,
  ignoreValue: readonly unknown[],
): RepoWorkflowConfigDiscoveryResult | undefined {
  for (const [index, pattern] of ignoreValue.entries()) {
    const failure = validateIgnorePattern(configPath, pattern, index);

    if (failure !== undefined) {
      return failure;
    }
  }

  return undefined;
}

function parseArtifactMappings(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  artifacts?: readonly RepoWorkflowArtifactMapping[];
} {
  return parseArtifactMappingList(configPath, value.artifacts);
}

function parseArtifactMappingList(
  configPath: string,
  artifactsValue: unknown,
): RepoWorkflowConfigDiscoveryResult & {
  artifacts?: readonly RepoWorkflowArtifactMapping[];
} {
  if (artifactsValue === undefined) {
    return {
      ok: true,
      artifacts: [],
    };
  }

  if (!Array.isArray(artifactsValue)) {
    return invalidArtifactMappingsList(configPath, artifactsValue);
  }

  const failure = validateArtifactMappings(configPath, artifactsValue);

  if (failure !== undefined) {
    return failure;
  }

  return {
    ok: true,
    artifacts: artifactsValue as RepoWorkflowArtifactMapping[],
  };
}

function invalidArtifactMappingsList(
  configPath: string,
  artifactsValue: unknown,
): RepoWorkflowConfigDiscoveryResult {
  return invalidConfig(configPath, {
    path: "artifacts",
    message: "`artifacts` must be a list.",
    expected: "A list of configured artifact mappings.",
    suggestion: "Use `artifacts:\\n  - source: docs/architecture.dp.yaml`.",
    badValue: artifactsValue,
  });
}

function validateArtifactMappings(
  configPath: string,
  artifacts: readonly unknown[],
): RepoWorkflowConfigDiscoveryResult | undefined {
  for (const [index, mapping] of artifacts.entries()) {
    const failure = validateArtifactMapping(configPath, mapping, index);

    if (failure !== undefined) {
      return failure;
    }
  }

  return undefined;
}

interface ParsedRepoWorkflowConfigParts {
  ignore: readonly string[];
  artifacts: readonly RepoWorkflowArtifactMapping[];
}

function parseRepoWorkflowConfigParts(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  parts?: ParsedRepoWorkflowConfigParts;
} {
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
    parts: {
      ignore: ignoredSourcesResult.ignore as readonly string[],
      artifacts:
        artifactMappingsResult.artifacts as readonly RepoWorkflowArtifactMapping[],
    },
  };
}

function createRepoWorkflowConfig(
  configPath: string,
  parts: ParsedRepoWorkflowConfigParts,
): RepoWorkflowConfig {
  return {
    path: configPath,
    directory: path.dirname(configPath),
    version: 1,
    sources: {
      ignore: parts.ignore,
    },
    artifacts: parts.artifacts,
  };
}

function createRepoWorkflowConfigFromRoot(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult {
  const partsResult = parseRepoWorkflowConfigParts(configPath, value);

  if (!partsResult.ok) {
    return partsResult;
  }

  return {
    ok: true,
    config: createRepoWorkflowConfig(
      configPath,
      partsResult.parts as ParsedRepoWorkflowConfigParts,
    ),
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

export async function discoverRepoWorkflowConfig(
  scopePath?: string,
): Promise<RepoWorkflowConfigDiscoveryResult> {
  return discoverRepoWorkflowConfigWithParser(
    scopePath,
    repoWorkflowConfigFileName,
    parseRepoWorkflowConfig,
  );
}
