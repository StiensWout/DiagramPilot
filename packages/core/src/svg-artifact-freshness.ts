import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { loadValidatedDiagramSpec, type DiagramPilotSourceFile, type ValidatedDiagramSpecLoadFailure } from "./source-loading.js";
import { getDiagramPilotVersion } from "./version.js";
import type { RepoWorkflowOutputProfile } from "./repo-workflow-config.js";

export interface SvgArtifactProvenance {
  sourcePath: string;
  sourceSha256: string;
  diagramPilotVersion: string;
  renderer: {
    name: string;
    version: string;
  };
  outputProfile?: RepoWorkflowOutputProfile;
}

export interface SvgArtifactRenderer {
  name: string;
  version: string;
}

export interface CreateSvgArtifactProvenanceOptions {
  sourcePath: string;
  sourceContent: string | Uint8Array;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  outputProfile?: RepoWorkflowOutputProfile;
}

export interface CheckExpectedSvgArtifactFreshnessOptions {
  sourcePath: string;
  provenanceSourcePath: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  outputProfile?: RepoWorkflowOutputProfile;
}

export interface CheckExpectedSvgArtifactFreshnessForValidatedSourceOptions {
  source: DiagramPilotSourceFile;
  artifactPath?: string;
  provenanceSourcePath: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  outputProfile?: RepoWorkflowOutputProfile;
}

export interface FreshSvgArtifactResult {
  sourcePath: string;
  artifactPath: string;
  status: "fresh";
  provenance: SvgArtifactProvenance;
}

export interface MissingSvgArtifactResult {
  sourcePath: string;
  artifactPath: string;
  status: "missing-artifact";
}

export interface UnreadableSvgArtifactResult {
  sourcePath: string;
  artifactPath: string;
  status: "unreadable-artifact";
  message: string;
}

export interface MalformedSvgArtifactResult {
  sourcePath: string;
  artifactPath: string;
  status: "malformed-artifact";
  message: string;
}

export interface MissingSvgArtifactProvenanceResult {
  sourcePath: string;
  artifactPath: string;
  status: "missing-provenance";
}

export type SvgArtifactStaleReason =
  | "source-path-mismatch"
  | "source-sha256-mismatch"
  | "diagram-pilot-version-mismatch"
  | "renderer-name-mismatch"
  | "renderer-version-mismatch"
  | "output-profile-mismatch";

export interface StaleSvgArtifactResult {
  sourcePath: string;
  artifactPath: string;
  status: "stale";
  reasons: readonly SvgArtifactStaleReason[];
  expected: SvgArtifactProvenance;
  actual: SvgArtifactProvenance;
}

export interface SvgArtifactUncheckedResult {
  sourcePath: string;
  artifactPath: string;
  status: "unchecked";
  validationFailure: ValidatedDiagramSpecLoadFailure;
}

export type SvgArtifactFreshnessCheckResult =
  | FreshSvgArtifactResult
  | MissingSvgArtifactResult
  | UnreadableSvgArtifactResult
  | MalformedSvgArtifactResult
  | MissingSvgArtifactProvenanceResult
  | StaleSvgArtifactResult
  | SvgArtifactUncheckedResult;

export function deriveExpectedSvgArtifactPath(sourcePath: string): string {
  return sourcePath.replace(/\.dp\.yaml$/iu, ".svg");
}

export function createSvgArtifactProvenance(
  options: CreateSvgArtifactProvenanceOptions,
): SvgArtifactProvenance {
  const outputProfile =
    options.outputProfile === undefined
      ? {}
      : { outputProfile: options.outputProfile };

  return {
    sourcePath: options.sourcePath,
    sourceSha256: createHash("sha256")
      .update(options.sourceContent)
      .digest("hex"),
    diagramPilotVersion: options.diagramPilotVersion ?? getDiagramPilotVersion(),
    renderer: options.renderer,
    ...outputProfile,
  };
}

function extractSvgArtifactProvenance(
  svg: string,
): SvgArtifactProvenance | undefined {
  const provenance = parseSvgArtifactProvenancePayload(svg);

  if (provenance === undefined) return undefined;

  assertSvgArtifactProvenanceShape(provenance);

  return provenance as SvgArtifactProvenance;
}

function parseSvgArtifactProvenancePayload(
  svg: string,
): Partial<SvgArtifactProvenance> | undefined {
  if (!/<svg\b/i.test(svg)) {
    throw new Error("Expected an SVG document.");
  }

  const match =
    /<metadata\b[^>]*id="diagrampilot-provenance"[^>]*>(?<json>.*?)<\/metadata>/isu.exec(
      svg,
    );

  if (match?.groups?.json === undefined) {
    return undefined;
  }

  return JSON.parse(
    match.groups.json,
  ) as Partial<SvgArtifactProvenance>;
}

function assertSvgArtifactProvenanceShape(
  provenance: Partial<SvgArtifactProvenance>,
): void {
  if (
    provenance === null ||
    typeof provenance !== "object"
  ) {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string sourcePath.",
    );
  }

  assertStringProvenanceField(provenance, "sourcePath");
  assertStringProvenanceField(provenance, "sourceSha256");
  assertStringProvenanceField(provenance, "diagramPilotVersion");
  assertOptionalOutputProfile(provenance);
  assertRendererProvenance(provenance);
}

function assertStringProvenanceField(
  provenance: Partial<SvgArtifactProvenance>,
  fieldName: "sourcePath" | "sourceSha256" | "diagramPilotVersion",
): void {
  if (typeof provenance[fieldName] === "string") return;

  throw new Error(
    `Malformed DiagramPilot provenance: expected string ${fieldName}.`,
  );
}

function assertRendererProvenance(
  provenance: Partial<SvgArtifactProvenance>,
): void {
  if (!hasRendererObject(provenance)) {
    throw new Error(
      "Malformed DiagramPilot provenance: expected renderer object.",
    );
  }

  assertStringRendererField(provenance.renderer.name, "name");
  assertStringRendererField(provenance.renderer.version, "version");
}

function hasRendererObject(
  provenance: Partial<SvgArtifactProvenance>,
): provenance is Partial<SvgArtifactProvenance> & {
  renderer: Partial<SvgArtifactRenderer>;
} {
  return provenance.renderer !== null && typeof provenance.renderer === "object";
}

function assertStringRendererField(value: unknown, fieldName: string): void {
  if (typeof value !== "string") {
    throw new Error(
      `Malformed DiagramPilot provenance: expected string renderer.${fieldName}.`,
    );
  }
}

function assertOptionalOutputProfile(
  provenance: Partial<SvgArtifactProvenance>,
): void {
  if (
    provenance.outputProfile === undefined ||
    typeof provenance.outputProfile === "string"
  ) {
    return;
  }

  throw new Error(
    "Malformed DiagramPilot provenance: expected string outputProfile.",
  );
}

const svgArtifactProvenanceComparisons: readonly {
  reason: SvgArtifactStaleReason;
  value: (provenance: SvgArtifactProvenance) => string | undefined;
}[] = [
  { reason: "source-path-mismatch", value: (provenance) => provenance.sourcePath },
  {
    reason: "source-sha256-mismatch",
    value: (provenance) => provenance.sourceSha256,
  },
  {
    reason: "diagram-pilot-version-mismatch",
    value: (provenance) => provenance.diagramPilotVersion,
  },
  {
    reason: "renderer-name-mismatch",
    value: (provenance) => provenance.renderer.name,
  },
  {
    reason: "renderer-version-mismatch",
    value: (provenance) => provenance.renderer.version,
  },
  {
    reason: "output-profile-mismatch",
    value: (provenance) => provenance.outputProfile,
  },
];

function compareSvgArtifactProvenance(
  expected: SvgArtifactProvenance,
  actual: SvgArtifactProvenance,
): readonly SvgArtifactStaleReason[] {
  return svgArtifactProvenanceComparisons.flatMap(({ reason, value }) =>
    value(actual) === value(expected) ? [] : [reason],
  );
}

export async function checkExpectedSvgArtifactFreshnessForValidatedSource(
  options: CheckExpectedSvgArtifactFreshnessForValidatedSourceOptions,
): Promise<SvgArtifactFreshnessCheckResult> {
  const sourcePath = options.source.path;
  const artifactPath =
    options.artifactPath ?? deriveExpectedSvgArtifactPath(sourcePath);
  const artifactContentResult = readSvgArtifactContent(sourcePath, artifactPath);

  if (!artifactContentResult.ok) return artifactContentResult.result;

  const expectedProvenance = createSvgArtifactProvenance({
    sourcePath: options.provenanceSourcePath,
    sourceContent: options.source.content,
    diagramPilotVersion: options.diagramPilotVersion,
    renderer: options.renderer,
    outputProfile: options.outputProfile,
  });
  const actualProvenanceResult = extractSvgArtifactProvenanceResult(
    sourcePath,
    artifactPath,
    artifactContentResult.content,
  );

  if (!actualProvenanceResult.ok) return actualProvenanceResult.result;

  return compareSvgArtifactFreshness({
    sourcePath,
    artifactPath,
    expectedProvenance,
    actualProvenance: actualProvenanceResult.provenance,
  });
}

function compareSvgArtifactFreshness(options: {
  sourcePath: string;
  artifactPath: string;
  expectedProvenance: SvgArtifactProvenance;
  actualProvenance: SvgArtifactProvenance | undefined;
}): FreshSvgArtifactResult | MissingSvgArtifactProvenanceResult | StaleSvgArtifactResult {
  if (options.actualProvenance === undefined) {
    return {
      sourcePath: options.sourcePath,
      artifactPath: options.artifactPath,
      status: "missing-provenance",
    };
  }

  const staleReasons = compareSvgArtifactProvenance(
    options.expectedProvenance,
    options.actualProvenance,
  );

  if (staleReasons.length > 0) {
    return {
      sourcePath: options.sourcePath,
      artifactPath: options.artifactPath,
      status: "stale",
      reasons: staleReasons,
      expected: options.expectedProvenance,
      actual: options.actualProvenance,
    };
  }

  return {
    sourcePath: options.sourcePath,
    artifactPath: options.artifactPath,
    status: "fresh",
    provenance: options.actualProvenance,
  };
}

function readSvgArtifactContent(sourcePath: string, artifactPath: string):
  | {
      ok: true;
      content: string;
    }
  | {
      ok: false;
      result: MissingSvgArtifactResult | UnreadableSvgArtifactResult;
    } {
  try {
    return {
      ok: true,
      content: readFileSync(artifactPath, "utf8"),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ok: false,
        result: {
          sourcePath,
          artifactPath,
          status: "missing-artifact",
        },
      };
    }

    const message =
      error instanceof Error ? error.message : `Unable to read ${artifactPath}`;

    return {
      ok: false,
      result: {
        sourcePath,
        artifactPath,
        status: "unreadable-artifact",
        message,
      },
    };
  }
}

function extractSvgArtifactProvenanceResult(
  sourcePath: string,
  artifactPath: string,
  artifactContent: string,
):
  | {
      ok: true;
      provenance: SvgArtifactProvenance | undefined;
    }
  | {
      ok: false;
      result: MalformedSvgArtifactResult;
    } {
  try {
    return {
      ok: true,
      provenance: extractSvgArtifactProvenance(artifactContent),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Malformed DiagramPilot provenance in ${artifactPath}`;

    return {
      ok: false,
      result: {
        sourcePath,
        artifactPath,
        status: "malformed-artifact",
        message,
      },
    };
  }
}

export async function checkExpectedSvgArtifactFreshness(
  options: CheckExpectedSvgArtifactFreshnessOptions,
): Promise<SvgArtifactFreshnessCheckResult> {
  const artifactPath = deriveExpectedSvgArtifactPath(options.sourcePath);
  const validatedSource = loadValidatedDiagramSpec(options.sourcePath);

  if (!validatedSource.ok) {
    return {
      sourcePath: options.sourcePath,
      artifactPath,
      status: "unchecked",
      validationFailure: validatedSource.failure,
    };
  }

  return checkExpectedSvgArtifactFreshnessForValidatedSource({
    source: validatedSource.source,
    provenanceSourcePath: options.provenanceSourcePath,
    diagramPilotVersion: options.diagramPilotVersion,
    renderer: options.renderer,
    outputProfile: options.outputProfile,
  });
}
