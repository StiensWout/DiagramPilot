import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkDiagramPilotRepoWorkflow,
  createDiagramSpecV1JsonSchema,
  discoverDiagramPilotSourceFiles,
  generateDiagramPilotRepoWorkflow,
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
  type DiagramSpec,
  type RepoWorkflowCheckResult,
  type RepoWorkflowGenerateResult,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { exportDiagramSpecToDot } from "@diagrampilot/export-dot";
import { exportDiagramSpecToMermaid } from "@diagrampilot/export-mermaid";
import {
  createSvgRendererProvenance,
  rasterizeSvgToPng,
  renderDiagramSpecToSvg,
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
} from "@diagrampilot/render-svg";

import { getDiagramPilotMcpPrompt } from "./prompts.js";
import { mutateSourceTool } from "./source-mutation-tools.js";
import { createSourceTool, suggestStableIdsTool } from "./source-tools.js";
import {
  stringArgument,
  stringArrayArgument,
  toolResult,
  validationFailureResult,
} from "./tool-helpers.js";
import type {
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
function generatedArtifactSummary(
  artifact: RepoWorkflowGenerateResult["written"][number],
): Record<string, string> {
  return {
    sourcePath: artifact.sourcePath,
    format: artifact.format,
    path: artifact.path,
  };
}
function redactedGenerateResult(
  result: RepoWorkflowGenerateResult,
): Record<string, unknown> {
  return Object.assign({}, result, {
    written: result.written.map((artifact) =>
      generatedArtifactSummary(artifact),
    ),
  });
}

function writeGeneratedArtifacts(
  result: RepoWorkflowGenerateResult,
  dependencies: DiagramPilotMcpToolDependencies,
): void {
  if (!result.ok) return;

  const write =
    dependencies.writeFile ??
    ((filePath: string, content: string | Uint8Array) => {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(
        filePath,
        content,
        typeof content === "string" ? "utf8" : undefined,
      );
    });

  for (const artifact of result.written) {
    write(artifact.absolutePath, artifact.content);
  }
}

async function runRepoWorkflowCheck(
  scopePath: string,
): Promise<RepoWorkflowCheckResult> {
  return await checkDiagramPilotRepoWorkflow({
    scopePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    exportConfiguredTextArtifact: ({ format, spec }) => exportText(format, spec),
  });
}

function missingGenerationScopeResult(): DiagramPilotMcpToolResult {
  const error = {
    path: "source_paths",
    message: "Provide at least one explicit source_paths or scope_paths entry.",
    expected:
      "A non-empty array of DiagramPilot Source File paths or directory scopes.",
    suggestion:
      "Call diagrampilot_generate_repo_outputs with source_paths or scope_paths.",
  };

  return toolResult(
    [
      "Missing required MCP tool argument: provide at least one source_paths or scope_paths entry.",
      "The MCP generation tool has no whole-repo default.",
      "",
    ].join("\n"),
    { ok: false, errorCount: 1, errors: [error] },
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
  const result = await runRepoWorkflowCheck(scopePath);

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
  const result = await runRepoWorkflowCheck(scopePath);

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

async function generateRepoOutputsForScope(
  scopePath: string,
  dependencies: DiagramPilotMcpToolDependencies,
): Promise<RepoWorkflowGenerateResult> {
  const render = dependencies.renderDiagramSpecToSvg ?? renderDiagramSpecToSvg;

  return await generateDiagramPilotRepoWorkflow({
    scopePath,
    diagramPilotVersion: getDiagramPilotVersion(),
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    renderSvgArtifact: async ({ source, provenanceSourcePath, spec }) =>
      await render(spec, {
        provenance: createSvgRendererProvenance({
          sourcePath: provenanceSourcePath,
          sourceContent: source.content,
        }),
      }),
    rasterizeSvgArtifact: rasterizeSvgToPng,
    exportTextArtifact: ({ format, spec }) => exportText(format, spec),
  });
}

function generateRepoOutputPayload(
  before: readonly RepoWorkflowCheckResult[],
  generated: readonly RepoWorkflowGenerateResult[],
): Record<string, unknown> {
  const redacted = generated.map((result) => redactedGenerateResult(result));

  if (redacted.length === 1) {
    return { ...redacted[0], before, after: redacted };
  }

  return { ok: generated.every((result) => result.ok), before, after: redacted };
}

async function generateRepoOutputsTool(
  args: Record<string, unknown>,
  dependencies: DiagramPilotMcpToolDependencies,
) {
  const sourcePaths = stringArrayArgument(args, "source_paths");
  const scopePaths = stringArrayArgument(args, "scope_paths");
  const explicitScopes = [...sourcePaths, ...scopePaths];

  if (explicitScopes.length === 0) {
    return missingGenerationScopeResult();
  }

  const before: RepoWorkflowCheckResult[] = [];
  const generated: RepoWorkflowGenerateResult[] = [];

  for (const scopePath of explicitScopes) {
    before.push(await runRepoWorkflowCheck(scopePath));
    const result = await generateRepoOutputsForScope(scopePath, dependencies);
    writeGeneratedArtifacts(result, dependencies);
    generated.push(result);
  }

  const ok = generated.every((result) => result.ok);
  const structuredContent = generateRepoOutputPayload(before, generated);

  return toolResult(
    `${JSON.stringify(structuredContent, null, 2)}\n`,
    structuredContent,
    { isError: ok ? undefined : true },
  );
}

const toolHandlers: Record<string, ToolHandler> = {
  diagrampilot_suggest_stable_ids: suggestStableIdsTool,
  diagrampilot_validate_source: validateSourceTool,
  diagrampilot_check_repo: checkRepoTool,
  diagrampilot_export_source: exportSourceTool,
  diagrampilot_render_source: renderSourceTool,
  diagrampilot_create_source: createSourceTool,
  diagrampilot_mutate_source: mutateSourceTool,
  diagrampilot_generate_repo_outputs: generateRepoOutputsTool,
};

export { getDiagramPilotMcpPrompt };
