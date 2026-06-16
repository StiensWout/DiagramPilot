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

export type RepoWorkflowDiscoveryPreset =
  | "typescript" | "node-package" | "monorepo";

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

export interface RepoWorkflowDiscoveryOptions {
  preset?: RepoWorkflowDiscoveryPreset;
}

export interface RepoWorkflowConfig {
  path: string;
  directory: string;
  version: 1;
  discovery?: RepoWorkflowDiscoveryOptions;
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

  const supportedFields = new Set([
    "version",
    "discovery",
    "sources",
    "artifacts",
  ]);
  const unsupportedField = Object.keys(value).find(
    (fieldName) => !supportedFields.has(fieldName),
  );

  if (unsupportedField !== undefined) {
    return {
      ok: false,
      failure: invalidConfigFailure(configPath, {
        path: unsupportedField,
        message: `Unsupported Repo Workflow Configuration field: ${unsupportedField}.`,
        expected: "Supported top-level fields: version, discovery, sources, artifacts.",
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

const discoveryPresets = new Set<RepoWorkflowDiscoveryPreset>([
  "typescript",
  "node-package",
  "monorepo",
]);

function isDiscoveryPreset(
  value: unknown,
): value is RepoWorkflowDiscoveryPreset {
  return (
    typeof value === "string" &&
    discoveryPresets.has(value as RepoWorkflowDiscoveryPreset)
  );
}

function validateDiscoveryObject(
  configPath: string,
  value: Record<string, unknown>,
):
  | {
      ok: true;
      discovery?: Record<string, unknown>;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigFailure;
    } {
  if (value.discovery === undefined) {
    return {
      ok: true,
    };
  }

  if (!isRecord(value.discovery)) {
    return invalidConfig(configPath, {
      path: "discovery",
      message: "`discovery` must be a YAML object when provided.",
      expected: "`discovery.preset` as an optional discovery preset.",
      suggestion: "Use `discovery:\\n  preset: typescript`.",
      badValue: value.discovery,
    });
  }

  return {
    ok: true,
    discovery: value.discovery,
  };
}

function validateDiscoveryFields(
  configPath: string,
  discovery: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const unsupportedField = Object.keys(discovery).find(
    (fieldName) => fieldName !== "preset",
  );

  if (unsupportedField !== undefined) {
    return invalidConfig(configPath, {
      path: `discovery.${unsupportedField}`,
      message: `Unsupported Repo Workflow Configuration field: discovery.${unsupportedField}.`,
      expected: "Supported discovery fields: preset.",
      suggestion: "Remove the unsupported field or upgrade DiagramPilot when that config feature ships.",
      badValue: discovery[unsupportedField],
    });
  }

  return undefined;
}

function parseDiscoveryPreset(
  configPath: string,
  discovery: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  preset?: RepoWorkflowDiscoveryPreset;
} {
  const preset = discovery.preset;

  if (preset === undefined) {
    return {
      ok: true,
    };
  }

  if (!isDiscoveryPreset(preset)) {
    return invalidConfig(configPath, {
      path: "discovery.preset",
      message: `Unsupported discovery preset: ${String(preset)}.`,
      expected: "Supported discovery presets: typescript, node-package, monorepo.",
      suggestion: "Use one of `typescript`, `node-package`, or `monorepo`.",
      badValue: preset,
    });
  }

  return {
    ok: true,
    preset,
  };
}

function parsePresentDiscoveryOptions(
  configPath: string,
  discovery: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  discovery?: RepoWorkflowDiscoveryOptions;
} {
  const fieldsFailure = validateDiscoveryFields(configPath, discovery);
  if (fieldsFailure !== undefined) return fieldsFailure;

  const presetResult = parseDiscoveryPreset(configPath, discovery);
  if (!presetResult.ok) return presetResult;

  return {
    ok: true,
    discovery: {
      preset: presetResult.preset,
    },
  };
}

function parseOptionalDiscoveryOptions(
  configPath: string,
  discovery: Record<string, unknown> | undefined,
): RepoWorkflowConfigDiscoveryResult & {
  discovery?: RepoWorkflowDiscoveryOptions;
} {
  return discovery === undefined
    ? { ok: true }
    : parsePresentDiscoveryOptions(configPath, discovery);
}

function parseDiscoveryOptions(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  discovery?: RepoWorkflowDiscoveryOptions;
} {
  const objectResult = validateDiscoveryObject(configPath, value);

  return objectResult.ok
    ? parseOptionalDiscoveryOptions(configPath, objectResult.discovery)
    : objectResult;
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
  discovery?: RepoWorkflowDiscoveryOptions;
  ignore: readonly string[];
  artifacts: readonly RepoWorkflowArtifactMapping[];
}

function parseRepoWorkflowConfigParts(
  configPath: string,
  value: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult & {
  parts?: ParsedRepoWorkflowConfigParts;
} {
  const discoveryResult = parseDiscoveryOptions(configPath, value);

  if (!discoveryResult.ok) {
    return discoveryResult;
  }

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
      discovery: discoveryResult.discovery,
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
    ...(parts.discovery === undefined ? {} : { discovery: parts.discovery }),
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
