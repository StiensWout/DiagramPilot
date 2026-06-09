import { getDiagramPilotVersion } from "@diagrampilot/core";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  DIAGRAMPILOT_MCP_PROMPTS,
  DIAGRAMPILOT_MCP_RESOURCES,
  DIAGRAMPILOT_MCP_TOOLS,
} from "./registry.js";
import {
  callDiagramPilotMcpTool,
  getDiagramPilotMcpPrompt,
  readDiagramPilotMcpResource,
} from "./runtime.js";
import type {
  DiagramPilotMcpPrompt,
  DiagramPilotMcpResource,
  DiagramPilotMcpServerOptions,
  DiagramPilotMcpTool,
} from "./types.js";

function templateListResource(resource: DiagramPilotMcpResource): {
  uri: string;
  name: string;
  title: string;
  description: string;
  mimeType: string;
} {
  const uri = resource.uriTemplate
    .replace("{version}", "v1")
    .replace("{page}", "mcp")
    .replace("{name}", "checkout")
    .replace("{scope}", encodeURIComponent(process.cwd()));

  return {
    uri,
    name: resource.name,
    title: resource.title,
    description: resource.description,
    mimeType: resource.mimeType,
  };
}

function toolInputSchema(tool: DiagramPilotMcpTool): Record<string, z.ZodType> {
  const schemas: Record<string, Record<string, z.ZodType>> = {
    diagrampilot_suggest_stable_ids: {
      labels: z.array(z.string()),
      existing_ids: z.array(z.string()).optional(),
    },
    diagrampilot_validate_source: {
      source_path: z.string(),
    },
    diagrampilot_check_repo: {
      scope_path: z.string().optional(),
    },
    diagrampilot_export_source: {
      source_path: z.string(),
      format: z.enum(["mermaid", "d2", "dot"]),
    },
    diagrampilot_render_source: {
      source_path: z.string(),
    },
    diagrampilot_create_source: {
      source_path: z.string(),
      diagram: z.record(z.string(), z.unknown()),
    },
    diagrampilot_generate_repo_outputs: {
      source_paths: z.array(z.string()).optional(),
      scope_paths: z.array(z.string()).optional(),
    },
  };

  return schemas[tool.name] ?? {};
}

function promptArgsSchema(
  prompt: DiagramPilotMcpPrompt,
): Record<string, z.ZodType> {
  if (prompt.name === "create_or_update_diagrampilot_source") {
    return {
      goal: z.string(),
      scope_path: z.string().optional(),
      source_path: z.string().optional(),
    };
  }

  if (prompt.name === "repair_diagrampilot_validation_errors") {
    return {
      source_path: z.string(),
      validation_errors: z.string(),
    };
  }

  return {
    scope_path: z.string().optional(),
  };
}

export function createDiagramPilotMcpServer(
  options: DiagramPilotMcpServerOptions = {},
): McpServer {
  const server = new McpServer(
    {
      name: "diagrampilot",
      version: getDiagramPilotVersion(),
    },
    {
      instructions:
        "Use DiagramPilot MCP read tools for inspection. Use explicit write tools only when creating DiagramPilot Source Files or refreshing Derived Artifacts.",
    },
  );

  for (const resource of DIAGRAMPILOT_MCP_RESOURCES) {
    server.registerResource(
      resource.name,
      new ResourceTemplate(resource.uriTemplate, {
        list: async () => ({
          resources: [templateListResource(resource)],
        }),
      }),
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri) => {
        const content = await readDiagramPilotMcpResource(uri.href);

        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              text: content.text,
            },
          ],
        };
      },
    );
  }

  for (const tool of DIAGRAMPILOT_MCP_TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: toolInputSchema(tool),
        annotations: {
          title: tool.title,
          ...tool.annotations,
        },
      },
      async (args) =>
        callDiagramPilotMcpTool(
          tool.name,
          args as Record<string, unknown>,
          options.toolDependencies,
        ),
    );
  }

  for (const prompt of DIAGRAMPILOT_MCP_PROMPTS) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: promptArgsSchema(prompt),
      },
      (args) =>
        getDiagramPilotMcpPrompt(prompt.name, args as Record<string, string>),
    );
  }

  return server;
}

export async function runStdioMcpServer(
  options: DiagramPilotMcpServerOptions = {},
): Promise<void> {
  const server = createDiagramPilotMcpServer(options);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}
