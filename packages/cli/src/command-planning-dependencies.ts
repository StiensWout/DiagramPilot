import type {
  DiagramSpec,
  RepoWorkflowCheckOptions,
  RepoWorkflowCheckResult,
  RepoWorkflowGenerateOptions,
  RepoWorkflowGenerateResult,
  RepoWorkflowInspectOptions,
  RepoWorkflowInspectResult,
  ValidatedDiagramSpecLoadResult,
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
  loadValidatedDiagramSpec(path: string): ValidatedDiagramSpecLoadResult;
  exportDiagramSpecToMermaid(spec: DiagramSpec): string;
  exportDiagramSpecToD2(spec: DiagramSpec): string;
  exportDiagramSpecToDot(spec: DiagramSpec): string;
  readSourceContent(path: string): string | Uint8Array;
  renderDiagramSpecToSvg(
    spec: DiagramSpec,
    options: { provenance?: SvgRendererProvenance },
  ): Promise<string>;
  rasterizeSvgToPng(svg: string): Uint8Array;
  createSvgRendererProvenance(
    options: CreateSvgRendererProvenanceOptions,
  ): SvgRendererProvenance;
  getDiagramPilotVersion(): string;
  pathExists?(path: string): boolean;
}
