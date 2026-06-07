import path from "node:path";

import type {
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
} from "./repo-workflow-config.js";
import type {
  DiagramPilotSourceDiscoveryFailure,
  DiagramPilotSourceDiscoveryOptions,
  DiagramPilotSourceDiscoveryResult,
  DiagramPilotSourceDiscoveryScope,
} from "./source-discovery.js";
import type {
  DiagramPilotSourceFile,
  RepairableDiagnosticReport,
  ValidatedDiagramSpecLoadFailure,
  ValidatedDiagramSpecLoadResult,
} from "./source-loading.js";
import type {
  StaleSvgArtifactResult,
  SvgArtifactFreshnessCheckResult,
  SvgArtifactProvenance,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

export interface RepoWorkflowCheckOptions {
  scopePath?: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
}

export interface RepoWorkflowCheckDependencies {
  discoverRepoWorkflowConfig?(
    scopePath?: string,
  ): Promise<RepoWorkflowConfigDiscoveryResult>;
  discoverDiagramPilotSourceFiles(
    scopePath?: string,
    options?: DiagramPilotSourceDiscoveryOptions,
  ): Promise<DiagramPilotSourceDiscoveryResult>;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  checkExpectedSvgArtifactFreshnessForValidatedSource(options: {
    source: DiagramPilotSourceFile;
    provenanceSourcePath: string;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<SvgArtifactFreshnessCheckResult>;
  createRepairableDiagnosticReport(
    failure: ValidatedDiagramSpecLoadFailure,
  ): RepairableDiagnosticReport;
  getCurrentWorkingDirectory(): string;
}

export interface RepoWorkflowCheckSummary {
  checkedSourceCount: number;
  freshSourceCount: number;
  issueCount: number;
}

export interface RepoWorkflowCheckSourceResult {
  sourcePath: string;
  validation:
    | {
        ok: true;
        errors: [];
      }
    | {
        ok: false;
        errors: RepairableDiagnosticReport["errors"];
      };
  artifact:
    | {
        status: "fresh";
        path: string;
        provenance: SvgArtifactProvenance;
      }
    | {
        status:
          | "missing-artifact"
          | "unreadable-artifact"
          | "malformed-artifact"
          | "missing-provenance";
        path: string;
        message?: string;
      }
    | {
        status: "stale";
        path: string;
        reasons: StaleSvgArtifactResult["reasons"];
        expected: StaleSvgArtifactResult["expected"];
        actual: StaleSvgArtifactResult["actual"];
      }
    | {
        status: "unchecked";
      };
}

export type RepoWorkflowCheckResult =
  | {
      ok: true;
      config?: {
        path: string;
      };
      scope: DiagramPilotSourceDiscoveryScope;
      summary: RepoWorkflowCheckSummary;
      sources: RepoWorkflowCheckSourceResult[];
    }
  | {
      ok: false;
      failure: DiagramPilotSourceDiscoveryFailure | RepoWorkflowConfigFailure;
    };

function normalizePathForDisplay(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function deriveCheckSourcePath(
  scope: DiagramPilotSourceDiscoveryScope,
  absolutePath: string,
  relativePath: string,
  currentWorkingDirectory: string,
): string {
  if (scope.kind === "directory") {
    return relativePath;
  }

  return normalizePathForDisplay(
    path.relative(currentWorkingDirectory, absolutePath),
  );
}

function deriveArtifactDisplayPath(
  sourcePath: string,
  artifactPath: string,
  currentWorkingDirectory: string,
): string {
  const relativeArtifactPath = normalizePathForDisplay(
    path.relative(currentWorkingDirectory, artifactPath),
  );

  if (!relativeArtifactPath.startsWith("..")) {
    return relativeArtifactPath;
  }

  return sourcePath.replace(/\.dp\.(yaml|json)$/iu, ".svg");
}

function deriveConfigDisplayPath(
  configPath: string,
  currentWorkingDirectory: string,
): string {
  const relativeConfigPath = path.relative(currentWorkingDirectory, configPath);

  if (
    relativeConfigPath !== "" &&
    !relativeConfigPath.startsWith("..") &&
    !path.isAbsolute(relativeConfigPath)
  ) {
    return normalizePathForDisplay(relativeConfigPath);
  }

  return normalizePathForDisplay(configPath);
}

function isWorkflowIssue(source: RepoWorkflowCheckSourceResult): boolean {
  return source.validation.ok === false || source.artifact.status !== "fresh";
}

function summarizeSources(
  sources: readonly RepoWorkflowCheckSourceResult[],
): RepoWorkflowCheckSummary {
  return {
    checkedSourceCount: sources.length,
    freshSourceCount: sources.filter(
      (source) => source.artifact.status === "fresh",
    ).length,
    issueCount: sources.filter(isWorkflowIssue).length,
  };
}

function mapArtifactResult(
  sourcePath: string,
  artifact: SvgArtifactFreshnessCheckResult,
  currentWorkingDirectory: string,
): RepoWorkflowCheckSourceResult["artifact"] {
  if (artifact.status === "unchecked") {
    return {
      status: "unchecked",
    };
  }

  const artifactPath = deriveArtifactDisplayPath(
    sourcePath,
    artifact.artifactPath,
    currentWorkingDirectory,
  );

  if (artifact.status === "fresh") {
    return {
      status: "fresh",
      path: artifactPath,
      provenance: artifact.provenance,
    };
  }

  if (artifact.status === "stale") {
    return {
      status: "stale",
      path: artifactPath,
      reasons: artifact.reasons,
      expected: artifact.expected,
      actual: artifact.actual,
    };
  }

  if (
    artifact.status === "unreadable-artifact" ||
    artifact.status === "malformed-artifact"
  ) {
    return {
      status: artifact.status,
      path: artifactPath,
      message: artifact.message,
    };
  }

  return {
    status: artifact.status,
    path: artifactPath,
  };
}

export async function checkDiagramPilotRepoWorkflowWithDependencies(
  options: RepoWorkflowCheckOptions,
  dependencies: RepoWorkflowCheckDependencies,
): Promise<RepoWorkflowCheckResult> {
  const configResult =
    dependencies.discoverRepoWorkflowConfig === undefined
      ? { ok: true as const }
      : await dependencies.discoverRepoWorkflowConfig(options.scopePath);

  if (!configResult.ok) {
    return {
      ok: false,
      failure: configResult.failure,
    };
  }

  const discoveryResult = await dependencies.discoverDiagramPilotSourceFiles(
    options.scopePath,
    configResult.config === undefined
      ? undefined
      : {
          ignorePatterns: configResult.config.sources.ignore,
          ignorePatternsRoot: configResult.config.directory,
        },
  );

  if (!discoveryResult.ok) {
    return {
      ok: false,
      failure: discoveryResult.failure,
    };
  }

  const currentWorkingDirectory = dependencies.getCurrentWorkingDirectory();
  const sources: RepoWorkflowCheckSourceResult[] = [];

  for (const source of discoveryResult.sources) {
    const sourcePath = deriveCheckSourcePath(
      discoveryResult.scope,
      source.absolutePath,
      source.relativePath,
      currentWorkingDirectory,
    );
    const loadResult = dependencies.loadValidatedDiagramSpec(
      source.absolutePath,
    );

    if (!loadResult.ok) {
      const report = dependencies.createRepairableDiagnosticReport(
        loadResult.failure,
      );

      sources.push({
        sourcePath,
        validation: {
          ok: false,
          errors: report.errors,
        },
        artifact: {
          status: "unchecked",
        },
      });
      continue;
    }

    const artifact =
      await dependencies.checkExpectedSvgArtifactFreshnessForValidatedSource({
        source: loadResult.source,
        provenanceSourcePath: sourcePath,
        diagramPilotVersion: options.diagramPilotVersion,
        renderer: options.renderer,
      });

    sources.push({
      sourcePath,
      validation: {
        ok: true,
        errors: [],
      },
      artifact: mapArtifactResult(
        sourcePath,
        artifact,
        currentWorkingDirectory,
      ),
    });
  }

  return {
    ok: true,
    ...(configResult.config === undefined
      ? {}
      : {
          config: {
            path: deriveConfigDisplayPath(
              configResult.config.path,
              currentWorkingDirectory,
            ),
          },
        }),
    scope: discoveryResult.scope,
    summary: summarizeSources(sources),
    sources,
  };
}
