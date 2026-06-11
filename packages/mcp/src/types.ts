import type {
  DiagramSpec,
  RepoWorkflowOutputProfile,
} from "@diagrampilot/core";
import { createSvgRendererProvenance } from "@diagrampilot/render-svg";

export type Writable = Pick<NodeJS.WritableStream, "write">;

export interface McpCliStreams {
  stdout: Writable;
  stderr: Writable;
}

export interface DiagramPilotMcpResource {
  name: string;
  uriTemplate: string;
  title: string;
  description: string;
  mimeType: string;
}

export interface DiagramPilotMcpTool {
  name: string;
  title: string;
  description: string;
  arguments: readonly DiagramPilotMcpArgument[];
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
  };
}

export interface DiagramPilotMcpPrompt {
  name: string;
  title: string;
  description: string;
  arguments: readonly DiagramPilotMcpArgument[];
}

export interface DiagramPilotMcpArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface DiagramPilotMcpResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export interface DiagramPilotMcpTextContent {
  type: "text";
  text: string;
}

export interface DiagramPilotMcpToolResult {
  [key: string]: unknown;
  content: [DiagramPilotMcpTextContent];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}

export interface DiagramPilotMcpPromptResult {
  [key: string]: unknown;
  description: string;
  messages: [
    {
      role: "user";
      content: DiagramPilotMcpTextContent;
    },
  ];
}

export interface DiagramPilotMcpToolDependencies {
  renderDiagramSpecToSvg?(
    spec: DiagramSpec,
    options: {
      provenance: ReturnType<typeof createSvgRendererProvenance>;
      profile?: RepoWorkflowOutputProfile;
    },
  ): Promise<string>;
  writeFile?(path: string, content: string | Uint8Array): void;
}

export interface DiagramPilotMcpServerOptions {
  toolDependencies?: DiagramPilotMcpToolDependencies;
}
