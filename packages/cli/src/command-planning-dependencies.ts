import type {
  DiagramSpec,
  DiagramSpecDiffResult,
  DiagramSpecLintResult,
  RepoWorkflowOutputProfile,
  RepoWorkflowCheckOptions,
  RepoWorkflowCheckResult,
  RepoWorkflowGenerateOptions,
  RepoWorkflowGenerateResult,
  RepoWorkflowInspectOptions,
  RepoWorkflowInspectResult,
  ValidatedDiagramSpecLoadResult,
  DiagramPilotSourceFixOptions,
  DiagramPilotSourceFixResult,
} from "@diagrampilot/core";
import type {
  CreateSvgRendererProvenanceOptions,
  SvgRendererProvenance,
} from "@diagrampilot/render-svg";

export interface CommandPlanningDependencies {
  checkDiagramPilotRepoWorkflow(
    options: RepoWorkflowCheckOptions,
  ): Promise<RepoWorkflowCheckResult>;
  inspectDiagramPilotRepoWorkflow(
    options: RepoWorkflowInspectOptions,
  ): Promise<RepoWorkflowInspectResult>;
  generateDiagramPilotRepoWorkflow(
    options: RepoWorkflowGenerateOptions,
  ): Promise<RepoWorkflowGenerateResult>;
  planDiagramPilotSourceFix(
    sourcePath: string,
    options: DiagramPilotSourceFixOptions,
  ): DiagramPilotSourceFixResult;
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  lintDiagramSpec(spec: DiagramSpec): DiagramSpecLintResult;
  diffDiagramSpecs(before: DiagramSpec, after: DiagramSpec): DiagramSpecDiffResult;
  exportDiagramSpecToMermaid(
    spec: DiagramSpec,
    options?: { profile?: RepoWorkflowOutputProfile },
  ): string;
  exportDiagramSpecToD2(
    spec: DiagramSpec,
    options?: { profile?: RepoWorkflowOutputProfile },
  ): string;
  exportDiagramSpecToDot(
    spec: DiagramSpec,
    options?: { profile?: RepoWorkflowOutputProfile },
  ): string;
  readSourceContent(path: string): string | Uint8Array;
  renderDiagramSpecToSvg(
    spec: DiagramSpec,
    options: {
      provenance?: SvgRendererProvenance;
      profile?: RepoWorkflowOutputProfile;
    },
  ): Promise<string>;
  rasterizeSvgToPng(svg: string): Uint8Array;
  createSvgRendererProvenance(
    options: CreateSvgRendererProvenanceOptions,
  ): SvgRendererProvenance;
  listPackagedLucideIconNames(): readonly string[];
  getDiagramPilotVersion(): string;
  pathExists?(path: string): boolean;
}
