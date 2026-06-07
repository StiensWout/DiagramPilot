import {
  checkDiagramPilotRepoWorkflowWithDependencies,
  type RepoWorkflowCheckOptions,
  type RepoWorkflowCheckResult,
} from "./repo-workflow-check.js";
import { discoverRepoWorkflowConfig } from "./repo-workflow-config.js";
import { createRepairableDiagnosticReport, loadValidatedDiagramSpec } from "./source-loading.js";
import { discoverDiagramPilotSourceFiles } from "./source-discovery.js";
import { checkExpectedSvgArtifactFreshnessForValidatedSource } from "./svg-artifact-freshness.js";

export async function checkDiagramPilotRepoWorkflow(
  options: RepoWorkflowCheckOptions,
): Promise<RepoWorkflowCheckResult> {
  return checkDiagramPilotRepoWorkflowWithDependencies(options, {
    discoverRepoWorkflowConfig,
    discoverDiagramPilotSourceFiles,
    loadValidatedDiagramSpec,
    checkExpectedSvgArtifactFreshnessForValidatedSource,
    createRepairableDiagnosticReport,
    getCurrentWorkingDirectory: () => process.cwd(),
  });
}
