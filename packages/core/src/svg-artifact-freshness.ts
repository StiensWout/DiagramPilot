import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { loadValidatedDiagramSpec, type DiagramPilotSourceFile, type ValidatedDiagramSpecLoadFailure } from "./source-loading.js";
import { getDiagramPilotVersion } from "./version.js";

export interface SvgArtifactProvenance {
  sourcePath: string;
  sourceSha256: string;
  diagramPilotVersion: string;
  renderer: {
    name: string;
    version: string;
  };
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
}

export interface CheckExpectedSvgArtifactFreshnessOptions {
  sourcePath: string;
  provenanceSourcePath: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
}

export interface CheckExpectedSvgArtifactFreshnessForValidatedSourceOptions {
  source: DiagramPilotSourceFile;
  artifactPath?: string;
  provenanceSourcePath: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
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
  | "renderer-version-mismatch";

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
  return sourcePath.replace(/\.dp\.(yaml|json)$/iu, ".svg");
}

export function createSvgArtifactProvenance(
  options: CreateSvgArtifactProvenanceOptions,
): SvgArtifactProvenance {
  return {
    sourcePath: options.sourcePath,
    sourceSha256: createHash("sha256")
      .update(options.sourceContent)
      .digest("hex"),
    diagramPilotVersion: options.diagramPilotVersion ?? getDiagramPilotVersion(),
    renderer: options.renderer,
  };
}

function extractSvgArtifactProvenance(
  svg: string,
): SvgArtifactProvenance | undefined {
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

  const provenance = JSON.parse(
    match.groups.json,
  ) as Partial<SvgArtifactProvenance>;

  if (
    provenance === null ||
    typeof provenance !== "object" ||
    typeof provenance.sourcePath !== "string"
  ) {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string sourcePath.",
    );
  }

  if (typeof provenance.sourceSha256 !== "string") {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string sourceSha256.",
    );
  }

  if (typeof provenance.diagramPilotVersion !== "string") {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string diagramPilotVersion.",
    );
  }

  if (
    provenance.renderer === null ||
    typeof provenance.renderer !== "object"
  ) {
    throw new Error(
      "Malformed DiagramPilot provenance: expected renderer object.",
    );
  }

  if (typeof provenance.renderer.name !== "string") {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string renderer.name.",
    );
  }

  if (typeof provenance.renderer.version !== "string") {
    throw new Error(
      "Malformed DiagramPilot provenance: expected string renderer.version.",
    );
  }

  return provenance as SvgArtifactProvenance;
}

function compareSvgArtifactProvenance(
  expected: SvgArtifactProvenance,
  actual: SvgArtifactProvenance,
): readonly SvgArtifactStaleReason[] {
  const reasons: SvgArtifactStaleReason[] = [];

  if (actual.sourcePath !== expected.sourcePath) {
    reasons.push("source-path-mismatch");
  }

  if (actual.sourceSha256 !== expected.sourceSha256) {
    reasons.push("source-sha256-mismatch");
  }

  if (actual.diagramPilotVersion !== expected.diagramPilotVersion) {
    reasons.push("diagram-pilot-version-mismatch");
  }

  if (actual.renderer.name !== expected.renderer.name) {
    reasons.push("renderer-name-mismatch");
  }

  if (actual.renderer.version !== expected.renderer.version) {
    reasons.push("renderer-version-mismatch");
  }

  return reasons;
}

export async function checkExpectedSvgArtifactFreshnessForValidatedSource(
  options: CheckExpectedSvgArtifactFreshnessForValidatedSourceOptions,
): Promise<SvgArtifactFreshnessCheckResult> {
  const sourcePath = options.source.path;
  const artifactPath =
    options.artifactPath ?? deriveExpectedSvgArtifactPath(sourcePath);
  let artifactContent: string;

  try {
    artifactContent = readFileSync(artifactPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        sourcePath,
        artifactPath,
        status: "missing-artifact",
      };
    }

    const message =
      error instanceof Error ? error.message : `Unable to read ${artifactPath}`;

    return {
      sourcePath,
      artifactPath,
      status: "unreadable-artifact",
      message,
    };
  }

  const expectedProvenance = createSvgArtifactProvenance({
    sourcePath: options.provenanceSourcePath,
    sourceContent: options.source.content,
    diagramPilotVersion: options.diagramPilotVersion,
    renderer: options.renderer,
  });
  let actualProvenance: SvgArtifactProvenance | undefined;

  try {
    actualProvenance = extractSvgArtifactProvenance(artifactContent);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Malformed DiagramPilot provenance in ${artifactPath}`;

    return {
      sourcePath,
      artifactPath,
      status: "malformed-artifact",
      message,
    };
  }

  if (actualProvenance === undefined) {
    return {
      sourcePath,
      artifactPath,
      status: "missing-provenance",
    };
  }

  const staleReasons = compareSvgArtifactProvenance(
    expectedProvenance,
    actualProvenance,
  );

  if (staleReasons.length > 0) {
    return {
      sourcePath,
      artifactPath,
      status: "stale",
      reasons: staleReasons,
      expected: expectedProvenance,
      actual: actualProvenance,
    };
  }

  return {
    sourcePath,
    artifactPath,
    status: "fresh",
    provenance: actualProvenance,
  };
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
  });
}
