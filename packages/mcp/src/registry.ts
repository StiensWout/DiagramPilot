import type {
  DiagramPilotMcpPrompt,
  DiagramPilotMcpResource,
  DiagramPilotMcpTool,
} from "./types.js";

export const DIAGRAMPILOT_MCP_PACKAGE_NAME = "@diagrampilot/mcp";

export const DIAGRAMPILOT_MCP_RESOURCES: readonly DiagramPilotMcpResource[] = [
  {
    name: "diagrampilot_schema_v1",
    uriTemplate: "diagrampilot://schema/{version}",
    title: "DiagramSpec v1 JSON Schema",
    description: "Read the generated DiagramSpec v1 JSON Schema.",
    mimeType: "application/schema+json",
  },
  {
    name: "diagrampilot_docs",
    uriTemplate: "diagrampilot://docs/{page}",
    title: "DiagramPilot Public Documentation",
    description: "Read canonical public DiagramPilot Markdown documentation.",
    mimeType: "text/markdown",
  },
  {
    name: "diagrampilot_examples",
    uriTemplate: "diagrampilot://examples/{name}",
    title: "DiagramPilot Examples",
    description: "Read DiagramPilot example sources and explanation.",
    mimeType: "text/markdown",
  },
  {
    name: "diagrampilot_discovered_sources",
    uriTemplate: "diagrampilot://sources/{scope}",
    title: "Discovered DiagramPilot Source Files",
    description: "Discover DiagramPilot Source Files under a local scope.",
    mimeType: "application/json",
  },
  {
    name: "diagrampilot_check_results",
    uriTemplate: "diagrampilot://check/{scope}",
    title: "Repo Workflow Check Results",
    description: "Read Repo Workflow Check results for a local scope.",
    mimeType: "application/json",
  },
];

const readOnlyToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

const writeToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
} as const;

export const DIAGRAMPILOT_MCP_TOOLS: readonly DiagramPilotMcpTool[] = [
  {
    name: "diagrampilot_validate_source",
    title: "Validate DiagramPilot Source",
    description: "Validate one DiagramPilot Source File and return repairable errors.",
    arguments: [
      {
        name: "source_path",
        description: "Local path to a *.dp.yaml DiagramPilot Source File.",
        required: true,
      },
    ],
    annotations: readOnlyToolAnnotations,
  },
  {
    name: "diagrampilot_check_repo",
    title: "Check DiagramPilot Repo Workflow",
    description: "Run the read-only Repo Workflow Check for a local scope.",
    arguments: [
      {
        name: "scope_path",
        description: "Local directory or DiagramPilot Source File path to check.",
        required: false,
      },
    ],
    annotations: readOnlyToolAnnotations,
  },
  {
    name: "diagrampilot_export_source",
    title: "Export DiagramPilot Source",
    description: "Export one valid DiagramPilot Source File to Mermaid, D2, or DOT text.",
    arguments: [
      {
        name: "source_path",
        description: "Local path to a *.dp.yaml DiagramPilot Source File.",
        required: true,
      },
      {
        name: "format",
        description: "Export format: mermaid, d2, or dot.",
        required: true,
      },
    ],
    annotations: readOnlyToolAnnotations,
  },
  {
    name: "diagrampilot_render_source",
    title: "Render DiagramPilot Source",
    description: "Render one valid DiagramPilot Source File to SVG text without writing it.",
    arguments: [
      {
        name: "source_path",
        description: "Local path to a *.dp.yaml DiagramPilot Source File.",
        required: true,
      },
    ],
    annotations: readOnlyToolAnnotations,
  },
  {
    name: "diagrampilot_generate_repo_outputs",
    title: "Generate DiagramPilot Repo Outputs",
    description:
      "Refresh configured DiagramPilot repo outputs for explicit source paths or directory scopes.",
    arguments: [
      {
        name: "source_paths",
        description:
          "Explicit DiagramPilot Source File paths to generate. At least one source_paths or scope_paths entry is required.",
        required: false,
      },
      {
        name: "scope_paths",
        description:
          "Explicit local directory scopes to generate. At least one source_paths or scope_paths entry is required.",
        required: false,
      },
    ],
    annotations: writeToolAnnotations,
  },
];

export const DIAGRAMPILOT_MCP_PROMPTS: readonly DiagramPilotMcpPrompt[] = [
  {
    name: "create_or_update_diagrampilot_source",
    title: "Create Or Update DiagramPilot Source",
    description: "Create or update a DiagramPilot Source File from repository context.",
    arguments: [
      {
        name: "goal",
        description: "Diagram update goal or desired diagram coverage.",
        required: true,
      },
      {
        name: "scope_path",
        description: "Local repository scope to inspect.",
        required: false,
      },
      {
        name: "source_path",
        description: "Existing or desired DiagramPilot Source File path.",
        required: false,
      },
    ],
  },
  {
    name: "repair_diagrampilot_validation_errors",
    title: "Repair DiagramPilot Validation Errors",
    description: "Repair validation errors in a DiagramPilot Source File.",
    arguments: [
      {
        name: "source_path",
        description: "DiagramPilot Source File path to repair.",
        required: true,
      },
      {
        name: "validation_errors",
        description: "Repairable validation errors returned by DiagramPilot.",
        required: true,
      },
    ],
  },
  {
    name: "refresh_diagrampilot_artifacts",
    title: "Refresh DiagramPilot Derived Artifacts",
    description: "Refresh Derived Artifacts after source changes.",
    arguments: [
      {
        name: "scope_path",
        description: "Local repository scope to check and generate.",
        required: false,
      },
    ],
  },
];
