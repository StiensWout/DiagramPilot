import type { DiagramSpec } from "./diagramspec-topology.js";
import { deriveRepoWorkflowSourceDisplayPath } from "./repo-workflow-paths.js";
import type {
  DiagramPilotSourceDiscoveryScope,
  DiscoveredDiagramPilotSourceFile,
} from "./source-discovery.js";
import type {
  DiagramPilotSourceFile,
  RepairableDiagnosticReport,
  ValidatedDiagramSpecLoadFailure,
  ValidatedDiagramSpecLoadResult,
} from "./source-loading.js";

export interface RepoWorkflowSourceLoadDependencies {
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  createRepairableDiagnosticReport(
    failure: ValidatedDiagramSpecLoadFailure,
  ): RepairableDiagnosticReport;
}

export type LoadedRepoWorkflowSource =
  | {
      ok: true;
      sourcePath: string;
      sourceAbsolutePath: string;
      source: DiagramPilotSourceFile;
      spec: DiagramSpec;
    }
  | {
      ok: false;
      sourcePath: string;
      errors: RepairableDiagnosticReport["errors"];
    };

export function loadRepoWorkflowSource(options: {
  source: DiscoveredDiagramPilotSourceFile;
  scope: DiagramPilotSourceDiscoveryScope;
  currentWorkingDirectory: string;
  dependencies: RepoWorkflowSourceLoadDependencies;
}): LoadedRepoWorkflowSource {
  const sourcePath = deriveRepoWorkflowSourceDisplayPath(
    options.scope,
    options.source.absolutePath,
    options.source.relativePath,
    options.currentWorkingDirectory,
  );
  const loadResult = options.dependencies.loadValidatedDiagramSpec(
    options.source.absolutePath,
  );

  if (!loadResult.ok) {
    const report = options.dependencies.createRepairableDiagnosticReport(
      loadResult.failure,
    );

    return {
      ok: false,
      sourcePath,
      errors: report.errors,
    };
  }

  return {
    ok: true,
    sourcePath,
    sourceAbsolutePath: options.source.absolutePath,
    source: loadResult.source,
    spec: loadResult.spec,
  };
}
