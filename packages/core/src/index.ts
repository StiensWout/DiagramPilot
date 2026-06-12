export {
  checkDiagramPilotRepoWorkflow,
  generateDiagramPilotRepoWorkflow,
  inspectDiagramPilotRepoWorkflow,
} from "./repo-workflow.js";
export { checkDiagramPilotRepoWorkflowWithDependencies } from "./repo-workflow-check.js";
export { generateDiagramPilotRepoWorkflowWithDependencies } from "./repo-workflow-generate.js";
export { inspectDiagramPilotRepoWorkflowWithDependencies } from "./repo-workflow-inspect.js";
export {
  createRepoWorkflowArtifactPlan,
  type RepoWorkflowArtifactPlan,
  type RepoWorkflowArtifactPlanItem,
  type RepoWorkflowArtifactPlanSource,
} from "./repo-workflow-artifact-plan.js";
export { createDiagramSpecV1JsonSchema } from "./diagramspec-schema.js";
export { createDiagramSpecTopology } from "./diagramspec-topology.js";
export { formatDiagramSpecTopologyLines } from "./diagramspec-topology-lines.js";
export { walkDiagramSpecTopology } from "./diagramspec-topology.js";
export {
  createRepairableDiagnosticReport,
  loadDiagramPilotSourceFile,
  loadValidatedDiagramSpec,
} from "./source-loading.js";
export { discoverDiagramPilotSourceFiles } from "./source-discovery.js";
export {
  checkExpectedSvgArtifactFreshness,
  checkExpectedSvgArtifactFreshnessForValidatedSource,
  createSvgArtifactProvenance,
  deriveExpectedSvgArtifactPath,
  normalizeSvgArtifactProvenanceSourcePath,
} from "./svg-artifact-freshness.js";
export { validateDiagramSpec } from "./diagramspec-validation.js";
export { serializeDiagramPilotSourceFile } from "./source-serialization.js";
export {
  createDiagramPilotSourceTemplate,
  diagramPilotSourceTemplateNames,
} from "./source-templates.js";
export { DIAGRAMPILOT_VERSION, getDiagramPilotVersion } from "./version.js";
export {
  MAINTAINABILITY_FILE_SIZE_GATE,
  auditMaintainabilityFileSizes,
} from "./maintainability-file-size-gate.js";

export type {
  RepoWorkflowCheckDependencies,
  RepoWorkflowCheckOptions,
  RepoWorkflowCheckResult,
  RepoWorkflowCheckSourceResult,
  RepoWorkflowCheckSummary,
} from "./repo-workflow-check.js";
export type {
  RepoWorkflowGenerateDependencies,
  RepoWorkflowGenerateFailure,
  RepoWorkflowGenerateOptions,
  RepoWorkflowGenerateResult,
  RepoWorkflowGenerateSkippedArtifact,
  RepoWorkflowGenerateSourceFailure,
  RepoWorkflowGenerateSummary,
  RepoWorkflowGenerateWrittenArtifact,
} from "./repo-workflow-generate.js";
export type {
  RepoWorkflowInspectArtifactResult,
  RepoWorkflowInspectDependencies,
  RepoWorkflowInspectDiagramSummary,
  RepoWorkflowInspectOptions,
  RepoWorkflowInspectResult,
  RepoWorkflowInspectSourceResult,
  RepoWorkflowInspectSummary,
} from "./repo-workflow-inspect.js";
export type {
  ConfiguredTextArtifactFormat,
  RepoWorkflowCheckConfiguredArtifactResult,
} from "./repo-workflow-configured-artifact-result.js";
export type { JsonSchemaDocument } from "./diagramspec-schema.js";
export type {
  DiagramSpec,
  DiagramSpecDirection,
  DiagramSpecEdge,
  DiagramSpecGroup,
  DiagramSpecMetadata,
  DiagramSpecNode,
  DiagramSpecTopology,
  DiagramSpecTopologyContainmentReference,
  DiagramSpecTopologyEntry,
  DiagramSpecTopologyGroupEntry,
  DiagramSpecTopologyNodeEntry,
  DiagramSpecTopologyObjectType,
  DiagramSpecTopologyWalkHandlers,
} from "./diagramspec-topology.js";
export type {
  DiagramPilotSourceFile,
  DiagramPilotSourceFormat,
  RepairableDiagnosticReport,
  SourceLoadFailure,
  SourceLoadResult,
  SourceParseFailure,
  SourceReadFailure,
  SourceUnsupportedFormatFailure,
  ValidatedDiagramSpecLoadFailure,
  ValidatedDiagramSpecLoadResult,
} from "./source-loading.js";
export type {
  DiscoveredDiagramPilotSourceFile,
  DiagramPilotSourceDiscoveryFailure,
  DiagramPilotSourceDiscoveryResult,
  DiagramPilotSourceDiscoveryScope,
} from "./source-discovery.js";
export type {
  RepoWorkflowArtifactMapping,
  RepoWorkflowArtifactOutput,
  RepoWorkflowArtifactOutputFormat,
  RepoWorkflowOutputProfile,
} from "./repo-workflow-config.js";
export type {
  CheckExpectedSvgArtifactFreshnessForValidatedSourceOptions,
  CheckExpectedSvgArtifactFreshnessOptions,
  CreateSvgArtifactProvenanceOptions,
  FreshSvgArtifactResult,
  MalformedSvgArtifactResult,
  MissingSvgArtifactProvenanceResult,
  MissingSvgArtifactResult,
  StaleSvgArtifactResult,
  SvgArtifactFreshnessCheckResult,
  SvgArtifactProvenance,
  SvgArtifactRenderer,
  SvgArtifactStaleReason,
  SvgArtifactUncheckedResult,
  UnreadableSvgArtifactResult,
} from "./svg-artifact-freshness.js";
export type {
  DiagramSpecValidationError,
  DiagramSpecValidationResult,
  RepairableDiagnostic,
} from "./diagramspec-validation.js";
export type {
  DiagramPilotSourceTemplateName,
  DiagramPilotSourceTemplateResult,
} from "./source-templates.js";
export type {
  MaintainabilityFileSizeAuditFile,
  MaintainabilityFileSizeAuditResult,
  MaintainabilityFileSizeGateDefinition,
  MaintainabilityFileSizeViolation,
} from "./maintainability-file-size-gate.js";
