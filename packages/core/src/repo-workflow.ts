import {
  checkDiagramPilotRepoWorkflowWithDependencies,
  type RepoWorkflowCheckOptions,
  type RepoWorkflowCheckResult,
} from "./repo-workflow-check.js";
import { createRepairableDiagnosticReport, loadValidatedDiagramSpec } from "./source-loading.js";
import { discoverDiagramPilotSourceFiles } from "./source-discovery.js";
import { checkExpectedSvgArtifactFreshnessForValidatedSource } from "./svg-artifact-freshness.js";

export async function checkDiagramPilotRepoWorkflow(
  options: RepoWorkflowCheckOptions,
): Promise<RepoWorkflowCheckResult> {
  return checkDiagramPilotRepoWorkflowWithDependencies(options, {
    discoverDiagramPilotSourceFiles,
    loadValidatedDiagramSpec,
    checkExpectedSvgArtifactFreshnessForValidatedSource,
    createRepairableDiagnosticReport,
    getCurrentWorkingDirectory: () => process.cwd(),
  });
}
