import {
  createRepoWorkflowArtifactPlan,
  type RepoWorkflowArtifactPlanItem,
} from "./repo-workflow-artifact-plan.js";
import type { RepoWorkflowConfig } from "./repo-workflow-config.js";
import type { LoadedRepoWorkflowSource } from "./repo-workflow-loaded-source.js";
import type {
  SvgArtifactFreshnessCheckResult,
  SvgArtifactRenderer,
} from "./svg-artifact-freshness.js";

type LoadedRepoWorkflowSourceSuccess = Extract<LoadedRepoWorkflowSource, { ok: true }>;

export interface CheckDefaultSvgArtifactOptions {
  config?: RepoWorkflowConfig;
  currentWorkingDirectory: string;
  diagramPilotVersion?: string;
  renderer: SvgArtifactRenderer;
  loadedSource: LoadedRepoWorkflowSourceSuccess;
  checkExpectedSvgArtifactFreshnessForValidatedSource(options: {
    source: LoadedRepoWorkflowSourceSuccess["source"];
    artifactPath?: string;
    provenanceSourcePath: string;
    diagramPilotVersion?: string;
    renderer: SvgArtifactRenderer;
  }): Promise<SvgArtifactFreshnessCheckResult>;
}

export interface CheckDefaultSvgArtifactResult {
  artifact: SvgArtifactFreshnessCheckResult;
  plannedOutput: RepoWorkflowArtifactPlanItem;
}

export async function checkDefaultSvgArtifactForLoadedSource(
  options: CheckDefaultSvgArtifactOptions,
): Promise<CheckDefaultSvgArtifactResult> {
  const [plannedOutput] = createRepoWorkflowArtifactPlan({
    config: options.config,
    source: { ...options.loadedSource, outputs: [] },
    currentWorkingDirectory: options.currentWorkingDirectory,
  }).outputs;

  const artifact =
    await options.checkExpectedSvgArtifactFreshnessForValidatedSource({
      source: options.loadedSource.source,
      artifactPath: plannedOutput.absolutePath,
      provenanceSourcePath: options.loadedSource.sourcePath,
      diagramPilotVersion: options.diagramPilotVersion,
      renderer: options.renderer,
    });

  return { artifact, plannedOutput };
}
