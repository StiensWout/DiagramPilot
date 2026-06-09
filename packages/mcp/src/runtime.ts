import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkDiagramPilotRepoWorkflow,
  createDiagramSpecV1JsonSchema,
  createRepairableDiagnosticReport,
  discoverDiagramPilotSourceFiles,
  loadValidatedDiagramSpec,
  type DiagramSpec,
  type ValidatedDiagramSpecLoadFailure,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToDot } from "@diagrampilot/export-dot";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  renderDiagramSpecToSvg,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
} from "@diagrampilot/render-svg";

import { DIAGRAMPILOT_MCP_PROMPTS } from "./registry.js";
import type {
  DiagramPilotMcpPromptResult,
  DiagramPilotMcpResourceContent,
  DiagramPilotMcpToolDependencies,
  DiagramPilotMcpToolResult,
} from "./types.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(packageRoot, "..", "..");

export function mcpHelpText(commandName = "diagrampilot-mcp"): string {
  return [
    "DiagramPilot MCP server",
    "",
    `Usage: ${commandName}`,
    "",
    "Starts the alpha DiagramPilot MCP server over stdio.",
    "",
  ].join("\n");
}

function readRepoText(relativePath: string): string {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function resourceContent(
  uri: string,
  mimeType: string,
  text: string,
): DiagramPilotMcpResourceContent {
  return { uri, mimeType, text };
}

function resourcePathParts(uri: string): string[] {
  const parsed = new URL(uri);

  if (parsed.protocol !== "diagrampilot:") {
    throw new Error(`Unsupported DiagramPilot MCP resource URI: ${uri}`);
  }

  return [
    parsed.hostname,
    ...parsed.pathname.split("/").filter((part) => part.length > 0),
  ];
}

function decodePathPart(value: string | undefined, fallback: string): string {
  return value === undefined ? fallback : decodeURIComponent(value);
}

function docsPath(page: string): string {
  return page === "index" ? "docs-public/index.md" : `docs-public/agents/${page}.md`;
}

function readExample(name: string): string {
  if (name !== "checkout") {
    throw new Error(`Unknown DiagramPilot example: ${name}`);
  }

  const source = readRepoText("demo-projects/checkout/docs/architecture.dp.yaml");

  return [
    "# Checkout Architecture",
    "",
    "Canonical checkout demo DiagramPilot Source File.",
    "",
    "```yaml",
    source.trimEnd(),
    "```",
    "",
  ].join("\n");
}

function exportText(format: string, spec: DiagramSpec): string {
  if (format === "mermaid") return exportDiagramSpecToMermaid(spec);
  if (format === "d2") return exportDiagramSpecToD2(spec);
  if (format === "dot") return exportDiagramSpecToDot(spec);

  throw new Error(`Unsupported DiagramPilot export format: ${format}`);
}

function toolResult(
  text: string,
  structuredContent: Record<string, unknown>,
  options: { isError?: boolean } = {},
): DiagramPilotMcpToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent,
    ...(options.isError === true ? { isError: true } : {}),
  };
}

function stringArgument(
  args: Record<string, unknown>,
  name: string,
  fallback?: string,
): string {
  const value = args[name];

  if (typeof value === "string" && value.length > 0) return value;
  if (fallback !== undefined) return fallback;

  throw new Error(`Missing required MCP tool argument: ${name}`);
}

function validationFailureResult(
  failure: ValidatedDiagramSpecLoadFailure,
): DiagramPilotMcpToolResult {
  const report = createRepairableDiagnosticReport(failure);

  return toolResult(
    report.text,
    {
      ok: false,
      errorCount: report.errors.length,
      errors: report.errors,
    },
    { isError: true },
  );
}

type ResourceHandler = (
  uri: string,
  value: string | undefined,
) => Promise<DiagramPilotMcpResourceContent>;

async function schemaResource(
  uri: string,
  value: string | undefined,
): Promise<DiagramPilotMcpResourceContent> {
  if (value !== "v1") {
    throw new Error(`Unknown DiagramPilot schema resource: ${uri}`);
  }

  return resourceContent(
    uri,
    "application/schema+json",
    `${JSON.stringify(createDiagramSpecV1JsonSchema(), null, 2)}\n`,
  );
}

async function docsResource(
  uri: string,
  value: string | undefined,
): Promise<DiagramPilotMcpResourceContent> {
  return resourceContent(
    uri,
    "text/markdown",
    readRepoText(docsPath(decodePathPart(value, "index"))),
  );
}

async function exampleResource(
  uri: string,
  value: string | undefined,
): Promise<DiagramPilotMcpResourceContent> {
  return resourceContent(
    uri,
    "text/markdown",
    readExample(decodePathPart(value, "checkout")),
  );
}

async function sourcesResource(
  uri: string,
  value: string | undefined,
): Promise<DiagramPilotMcpResourceContent> {
  const scopePath = decodePathPart(value, process.cwd());
  const discovery = await discoverDiagramPilotSourceFiles(scopePath);
  const payload = discovery.ok
    ? {
        ok: true,
        scope: discovery.scope,
        sources: discovery.sources.map((source) => ({
          relativePath: source.relativePath,
        })),
      }
    : {
        ok: false,
        failure: discovery.failure,
      };

  return resourceContent(
    uri,
    "application/json",
    `${JSON.stringify(payload, null, 2)}\n`,
  );
}

async function checkResource(
  uri: string,
  value: string | undefined,
): Promise<DiagramPilotMcpResourceContent> {
  const scopePath = decodePathPart(value, process.cwd());
  const result = await checkDiagramPilotRepoWorkflow({
    scopePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    exportConfiguredTextArtifact: ({ format, spec }) => exportText(format, spec),
  });

  return resourceContent(
    uri,
    "application/json",
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

const resourceHandlers: Record<string, ResourceHandler> = {
  schema: schemaResource,
  docs: docsResource,
  examples: exampleResource,
  sources: sourcesResource,
  check: checkResource,
};

export async function readDiagramPilotMcpResource(
  uri: string,
): Promise<DiagramPilotMcpResourceContent> {
  const [kind, value] = resourcePathParts(uri);
  const handler = resourceHandlers[kind];

  if (handler === undefined) {
    throw new Error(`Unknown DiagramPilot MCP resource: ${uri}`);
  }

  return handler(uri, value);
}

export async function callDiagramPilotMcpTool(
  name: string,
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies = {},
): Promise<DiagramPilotMcpToolResult> {
  const handler = toolHandlers[name];

  if (handler === undefined) {
    throw new Error(`Unknown DiagramPilot MCP tool: ${name}`);
  }

  return handler(args, dependencies);
}

type ToolHandler = (
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies,
) => Promise<DiagramPilotMcpToolResult>;

async function validateSourceTool(args: Record<string, unknown>) {
  const sourcePath = stringArgument(args, "source_path");
  const loaded = loadValidatedDiagramSpec(sourcePath);

  if (!loaded.ok) return validationFailureResult(loaded.failure);

  return toolResult(`Valid ${sourcePath}\n`, {
    ok: true,
    errorCount: 0,
  });
}

async function checkRepoTool(args: Record<string, unknown>) {
  const scopePath = stringArgument(args, "scope_path", process.cwd());
  const result = await checkDiagramPilotRepoWorkflow({
    scopePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    exportConfiguredTextArtifact: ({ format, spec }) => exportText(format, spec),
  });

  return toolResult(`${JSON.stringify(result, null, 2)}\n`, result);
}

async function exportSourceTool(args: Record<string, unknown>) {
  const sourcePath = stringArgument(args, "source_path");
  const format = stringArgument(args, "format");
  const loaded = loadValidatedDiagramSpec(sourcePath);

  if (!loaded.ok) return validationFailureResult(loaded.failure);

  return toolResult(exportText(format, loaded.spec), {
    ok: true,
    format,
    sourcePath,
  });
}

async function renderSourceTool(
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies,
) {
  const sourcePath = stringArgument(args, "source_path");
  const loaded = loadValidatedDiagramSpec(sourcePath);

  if (!loaded.ok) return validationFailureResult(loaded.failure);

  const render = dependencies.renderDiagramSpecToSvg ?? renderDiagramSpecToSvg;
  const svg = await render(loaded.spec, {
    provenance: createSvgRendererProvenance({
      sourcePath,
      sourceContent: loaded.source.content,
    }),
  });

  return toolResult(svg, {
    ok: true,
    format: "svg",
    sourcePath,
  });
}

const toolHandlers: Record<string, ToolHandler> = {
  diagrampilot_validate_source: validateSourceTool,
  diagrampilot_check_repo: checkRepoTool,
  diagrampilot_export_source: exportSourceTool,
  diagrampilot_render_source: renderSourceTool,
};

function createOrUpdatePrompt(args: Record<string, string>): string {
  const scopePath = args.scope_path ?? ".";
  const sourcePath = args.source_path ?? "docs/architecture.dp.yaml";

  return [
    `Goal: ${args.goal ?? "Create or update a DiagramPilot Source File."}`,
    "",
    `Inspect ${scopePath} for repo context, then create or update ${sourcePath}.`,
    "Use DiagramSpec stable IDs, preserve YAML as the source of truth, and run:",
    "",
    `diagrampilot validate ${sourcePath}`,
    `diagrampilot check ${scopePath}`,
    "",
  ].join("\n");
}

function repairValidationPrompt(args: Record<string, string>): string {
  const sourcePath = args.source_path ?? "docs/architecture.dp.yaml";

  return [
    `Repair DiagramPilot validation errors in ${sourcePath}.`,
    "",
    "Use these repairable errors as the source of truth:",
    "",
    args.validation_errors ?? "<paste validation errors>",
    "",
    `After editing, run diagrampilot validate ${sourcePath}.`,
    "",
  ].join("\n");
}

function refreshArtifactsPrompt(args: Record<string, string>): string {
  const scopePath = args.scope_path ?? ".";

  return [
    `Refresh DiagramPilot Derived Artifacts under ${scopePath}.`,
    "",
    `First run diagrampilot check ${scopePath}.`,
    `Then run diagrampilot generate ${scopePath} for stale or missing generated artifacts.`,
    "Do not hand-edit generated artifacts.",
    "",
  ].join("\n");
}

const promptTextHandlers: Record<string, (args: Record<string, string>) => string> = {
  create_or_update_diagrampilot_source: createOrUpdatePrompt,
  repair_diagrampilot_validation_errors: repairValidationPrompt,
  refresh_diagrampilot_artifacts: refreshArtifactsPrompt,
};

export function getDiagramPilotMcpPrompt(
  name: string,
  args: Record<string, string> = {},
): DiagramPilotMcpPromptResult {
  const prompt = DIAGRAMPILOT_MCP_PROMPTS.find((entry) => entry.name === name);
  const promptText = promptTextHandlers[name];

  if (prompt === undefined || promptText === undefined) {
    throw new Error(`Unknown DiagramPilot MCP prompt: ${name}`);
  }

  return {
    description: prompt.title,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText(args),
        },
      },
    ],
  };
}
