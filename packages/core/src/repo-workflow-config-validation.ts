import path from "node:path";

import type { RepairableDiagnostic } from "./diagramspec-validation.js";
import type {
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowOutputProfile,
} from "./repo-workflow-config.js";

const artifactOutputFormats = new Set<RepoWorkflowArtifactOutputFormat>([
  "svg",
  "png",
  "mermaid",
  "d2",
  "dot",
  "markdown",
]);

const artifactOutputFormatList = "svg, png, mermaid, d2, dot, markdown";
const artifactOutputFields = new Set(["format", "path", "profile"]);
const artifactOutputFieldList = "format, path, profile";
const artifactOutputProfiles = new Set<RepoWorkflowOutputProfile>([
  "clean",
  "compact",
  "presentation",
]);
const artifactOutputProfileList = "clean, compact, presentation";
const artifactOutputTemplateVariables = new Set([
  "stem",
  "sourceDir",
  "sourcePath",
  "format",
]);
const artifactOutputTemplateVariableList = "stem, sourceDir, sourcePath, format";

function normalizePathForConfig(filePath: string): string {
  return filePath.split(path.sep).join("/");
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

export function invalidConfig(
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbsoluteConfigPath(value: string): boolean {
  return path.posix.isAbsolute(value) || path.win32.isAbsolute(value);
}

function leavesConfigTree(value: string): boolean {
  return normalizePathForConfig(value).split("/").includes("..");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isSupportedTemplateVariable(variable: string | undefined): boolean {
  return (
    variable !== undefined &&
    artifactOutputTemplateVariables.has(variable)
  );
}

function hasOutputsList(mapping: Record<string, unknown>): boolean {
  return Array.isArray(mapping.outputs) && mapping.outputs.length > 0;
}

export function validateIgnorePattern(
  configPath: string,
  pattern: unknown,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const diagnosticPath = `sources.ignore[${index}]`;

  if (!isNonEmptyString(pattern)) {
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

function validateArtifactMappingObject(
  configPath: string,
  mapping: unknown,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  if (isRecord(mapping)) return undefined;

  return invalidConfig(configPath, {
    path: `artifacts[${index}]`,
    message: "Artifact mappings must be YAML objects.",
    expected: "An object with exactly one of `source` or `sourceGlob`.",
    suggestion:
      "Use `source: docs/architecture.dp.yaml` or `sourceGlob: docs/**/*.dp.yaml`.",
    badValue: mapping,
  });
}

function validateArtifactSelector(
  configPath: string,
  mapping: Record<string, unknown>,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const diagnosticPath = `artifacts[${index}]`;
  const hasSource = mapping.source !== undefined;
  const hasSourceGlob = mapping.sourceGlob !== undefined;

  if (hasSource === hasSourceGlob) {
    return invalidArtifactSelectorCardinality(configPath, diagnosticPath, mapping);
  }

  const selectorName = hasSource ? "source" : "sourceGlob";

  return validateArtifactSelectorValue(
    configPath,
    mapping[selectorName],
    `${diagnosticPath}.${selectorName}`,
  );
}

function invalidArtifactSelectorCardinality(
  configPath: string,
  diagnosticPath: string,
  mapping: Record<string, unknown>,
): RepoWorkflowConfigDiscoveryResult {
  return invalidConfig(configPath, {
    path: diagnosticPath,
    message: "Artifact mappings must set exactly one of `source` or `sourceGlob`.",
    expected: "Exactly one source selector.",
    suggestion:
      "Keep either `source` for one DiagramPilot Source File or `sourceGlob` for a set of source files.",
    badValue: mapping,
  });
}

function validateArtifactSelectorValue(
  configPath: string,
  selectorValue: unknown,
  diagnosticPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  if (!isNonEmptyString(selectorValue)) {
    return invalidConfig(configPath, {
      path: diagnosticPath,
      message: "Artifact mapping source selectors must be non-empty strings.",
      expected: "A source path or source glob relative to the config directory.",
      suggestion: "Use a relative path such as `docs/architecture.dp.yaml`.",
      badValue: selectorValue,
    });
  }

  if (isAbsoluteConfigPath(selectorValue) || leavesConfigTree(selectorValue)) {
    return invalidConfig(configPath, {
      path: diagnosticPath,
      message:
        "Artifact mapping source selectors must stay within the config directory tree.",
      expected: "A relative path that does not include `..` segments.",
      suggestion: "Use a path rooted inside the configured repository tree.",
      badValue: selectorValue,
    });
  }

  return undefined;
}

function validateArtifactOutput(
  configPath: string,
  output: unknown,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const outputResult = parseArtifactOutputObject(configPath, output, outputPath);

  if (!outputResult.ok) return outputResult.failure;

  return validateArtifactOutputProperties(
    configPath,
    outputResult.output,
    outputPath,
  );
}

function parseArtifactOutputObject(
  configPath: string,
  output: unknown,
  outputPath: string,
):
  | {
      ok: true;
      output: Record<string, unknown>;
    }
  | {
      ok: false;
      failure: RepoWorkflowConfigDiscoveryResult;
    } {
  if (isRecord(output)) {
    return {
      ok: true,
      output,
    };
  }

  return {
    ok: false,
    failure: invalidConfig(configPath, {
      path: outputPath,
      message: "Artifact outputs must be YAML objects.",
      expected: "An object with `format` and `path`.",
      suggestion: "Use `format: svg` and `path: docs/{stem}.svg`.",
      badValue: output,
    }),
  };
}

function validateArtifactOutputProperties(
  configPath: string,
  output: Record<string, unknown>,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  return (
    validateArtifactOutputFields(configPath, output, outputPath) ??
    validateArtifactOutputFormat(configPath, output, outputPath) ??
    validateArtifactOutputProfile(configPath, output, outputPath) ??
    validateArtifactOutputPath(configPath, output, outputPath)
  );
}

function validateArtifactOutputFields(
  configPath: string,
  output: Record<string, unknown>,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const unsupportedField = Object.keys(output).find(
    (fieldName) => !artifactOutputFields.has(fieldName),
  );

  if (unsupportedField === undefined) return undefined;

  return invalidConfig(configPath, {
    path: `${outputPath}.${unsupportedField}`,
    message: `Unsupported artifact output field: ${unsupportedField}.`,
    expected: `Supported artifact output fields: ${artifactOutputFieldList}.`,
    suggestion: "Remove the unsupported field or use a supported output field.",
    badValue: output[unsupportedField],
  });
}

function validateArtifactOutputFormat(
  configPath: string,
  output: Record<string, unknown>,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  if (artifactOutputFormats.has(output.format as RepoWorkflowArtifactOutputFormat)) {
    return undefined;
  }

  return invalidConfig(configPath, {
    path: `${outputPath}.format`,
    message: `Unsupported artifact output format: ${String(output.format)}.`,
    expected: `One of: ${artifactOutputFormatList}.`,
    suggestion: "Use a supported Derived Artifact format.",
    badValue: output.format,
  });
}

function validateArtifactOutputProfile(
  configPath: string,
  output: Record<string, unknown>,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  if (output.profile === undefined) return undefined;

  if (artifactOutputProfiles.has(output.profile as RepoWorkflowOutputProfile)) {
    return undefined;
  }

  return invalidConfig(configPath, {
    path: `${outputPath}.profile`,
    message: `Unsupported artifact output profile: ${String(output.profile)}.`,
    expected: `One of: ${artifactOutputProfileList}.`,
    suggestion: "Use a fixed output profile or remove the profile field.",
    badValue: output.profile,
  });
}

function validateArtifactOutputPath(
  configPath: string,
  output: Record<string, unknown>,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  if (!isNonEmptyString(output.path)) {
    return invalidConfig(configPath, {
      path: `${outputPath}.path`,
      message: "Artifact output paths must be non-empty strings.",
      expected: "A path template relative to the config directory.",
      suggestion: "Use a template such as `docs/{stem}.{format}`.",
      badValue: output.path,
    });
  }

  if (isAbsoluteConfigPath(output.path) || leavesConfigTree(output.path)) {
    return invalidConfig(configPath, {
      path: `${outputPath}.path`,
      message: "Artifact output paths must stay within the config directory tree.",
      expected: "A relative path template that does not include `..` segments.",
      suggestion: "Use a path rooted inside the configured repository tree.",
      badValue: output.path,
    });
  }

  return validateArtifactOutputTemplate(configPath, output.path, outputPath);
}

function validateArtifactOutputTemplate(
  configPath: string,
  pathTemplate: string,
  outputPath: string,
): RepoWorkflowConfigDiscoveryResult | undefined {
  for (const match of pathTemplate.matchAll(/\{(?<variable>[^{}]+)\}/gu)) {
    const variable = match.groups?.variable;

    if (isSupportedTemplateVariable(variable)) continue;

    return invalidConfig(configPath, {
      path: `${outputPath}.path`,
      message: `Unsupported artifact output path template variable: ${String(variable)}.`,
      expected: `Supported variables: ${artifactOutputTemplateVariableList}.`,
      suggestion: "Use only fixed variables such as `{sourceDir}/{stem}.{format}`.",
      badValue: pathTemplate,
    });
  }

  return undefined;
}

function validateArtifactOutputsList(
  configPath: string,
  mapping: Record<string, unknown>,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const diagnosticPath = `artifacts[${index}]`;

  if (!hasOutputsList(mapping)) {
    return invalidConfig(configPath, {
      path: `${diagnosticPath}.outputs`,
      message: "Artifact mappings must declare at least one output.",
      expected: "A non-empty `outputs` list.",
      suggestion:
        "Add an output such as `outputs:\\n  - format: svg\\n    path: docs/{stem}.svg`.",
      badValue: mapping.outputs,
    });
  }

  const outputs = mapping.outputs as unknown[];

  for (const [outputIndex, output] of outputs.entries()) {
    const failure = validateArtifactOutput(
      configPath,
      output,
      `${diagnosticPath}.outputs[${outputIndex}]`,
    );

    if (failure !== undefined) return failure;
  }

  return undefined;
}

export function validateArtifactMapping(
  configPath: string,
  mapping: unknown,
  index: number,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const objectFailure = validateArtifactMappingObject(configPath, mapping, index);

  if (objectFailure !== undefined || !isRecord(mapping)) return objectFailure;

  return (
    validateArtifactSelector(configPath, mapping, index) ??
    validateArtifactOutputsList(configPath, mapping, index)
  );
}
