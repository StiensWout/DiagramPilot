import type { DiagramSpec } from "./diagramspec-topology.js";
import { validateDiagramSpec } from "./diagramspec-validation.js";
import { serializeDiagramPilotSourceFile } from "./source-serialization.js";

export const diagramPilotSourceTemplateNames = [
  "architecture",
  "flow",
  "package-map",
  "system-context",
  "service-map",
] as const;

export type DiagramPilotSourceTemplateName =
  (typeof diagramPilotSourceTemplateNames)[number];

export type DiagramPilotSourceTemplateResult =
  | {
      ok: true;
      name: DiagramPilotSourceTemplateName;
      spec: DiagramSpec;
      content: string;
    }
  | {
      ok: false;
      name: string;
      message: string;
    };

const sourceTemplates: Readonly<Record<DiagramPilotSourceTemplateName, DiagramSpec>> = {
  architecture: {
    version: 1,
    title: "Starter Architecture",
    description: "A starter system architecture DiagramPilot Source File.",
    direction: "right",
    nodes: [
      {
        id: "web_app",
        label: "Web App",
        kind: "frontend",
        icon: "lucide:globe",
      },
      {
        id: "api_gateway",
        label: "API Gateway",
        kind: "service",
        icon: "lucide:server",
      },
      {
        id: "application_service",
        label: "Application Service",
        kind: "service",
        icon: "lucide:server-cog",
      },
      {
        id: "data_store",
        label: "Data Store",
        kind: "database",
        icon: "lucide:database",
      },
    ],
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: ["api_gateway", "application_service", "data_store"],
      },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
      },
      {
        id: "api_gateway_to_application_service",
        from: "api_gateway",
        to: "application_service",
        label: "routes request",
      },
      {
        id: "application_service_to_data_store",
        from: "application_service",
        to: "data_store",
        label: "reads and writes",
      },
    ],
  },
  flow: {
    version: 1,
    title: "Starter Flow",
    description: "A starter flow DiagramPilot Source File.",
    direction: "down",
    nodes: [
      {
        id: "start",
        label: "Start",
        kind: "start",
        icon: "lucide:circle-play",
      },
      {
        id: "process_step",
        label: "Process Step",
        kind: "process",
        icon: "lucide:settings",
      },
      {
        id: "decision_point",
        label: "Decision Point",
        kind: "decision",
        icon: "lucide:diamond",
      },
      {
        id: "success_outcome",
        label: "Success Outcome",
        kind: "end",
        icon: "lucide:circle-check",
      },
      {
        id: "fallback_outcome",
        label: "Fallback Outcome",
        kind: "end",
        icon: "lucide:circle-x",
      },
    ],
    edges: [
      {
        id: "start_to_process_step",
        from: "start",
        to: "process_step",
      },
      {
        id: "process_step_to_decision_point",
        from: "process_step",
        to: "decision_point",
      },
      {
        id: "decision_point_to_success_outcome",
        from: "decision_point",
        to: "success_outcome",
        label: "yes",
      },
      {
        id: "decision_point_to_fallback_outcome",
        from: "decision_point",
        to: "fallback_outcome",
        label: "no",
      },
    ],
  },
  "package-map": {
    version: 1,
    title: "Starter Package Map",
    description: "A starter package dependency DiagramPilot Source File.",
    direction: "right",
    nodes: [
      {
        id: "app_package",
        label: "App Package",
        kind: "package",
        icon: "lucide:box",
      },
      {
        id: "cli_package",
        label: "CLI Package",
        kind: "package",
        icon: "lucide:terminal",
      },
      {
        id: "core_package",
        label: "Core Package",
        kind: "package",
        icon: "lucide:box",
      },
      {
        id: "render_package",
        label: "Render Package",
        kind: "package",
        icon: "lucide:file-image",
      },
      {
        id: "export_package",
        label: "Export Package",
        kind: "package",
        icon: "lucide:file-code",
      },
    ],
    groups: [
      {
        id: "workspace",
        label: "Workspace",
        contains: [
          "app_package",
          "cli_package",
          "core_package",
          "render_package",
          "export_package",
        ],
      },
    ],
    edges: [
      {
        id: "app_package_to_cli_package",
        from: "app_package",
        to: "cli_package",
        label: "runs",
      },
      {
        id: "cli_package_to_core_package",
        from: "cli_package",
        to: "core_package",
        label: "validates",
      },
      {
        id: "cli_package_to_render_package",
        from: "cli_package",
        to: "render_package",
        label: "renders",
      },
      {
        id: "cli_package_to_export_package",
        from: "cli_package",
        to: "export_package",
        label: "exports",
      },
    ],
  },
  "system-context": {
    version: 1,
    title: "Starter System Context",
    description: "A starter system context DiagramPilot Source File.",
    direction: "right",
    nodes: [
      {
        id: "ai_coding_agent",
        label: "AI Coding Agent",
        kind: "actor",
        icon: "lucide:bot",
      },
      {
        id: "local_repository",
        label: "Local Repository",
        kind: "system",
        icon: "lucide:folder-git-2",
      },
      {
        id: "diagrampilot_cli",
        label: "DiagramPilot CLI",
        kind: "tool",
        icon: "lucide:terminal",
      },
      {
        id: "pull_request",
        label: "Pull Request",
        kind: "review",
        icon: "lucide:git-pull-request",
      },
    ],
    groups: [
      {
        id: "repo_native_workflow",
        label: "Repo-Native Workflow",
        contains: [
          "ai_coding_agent",
          "local_repository",
          "diagrampilot_cli",
          "pull_request",
        ],
        kind: "workflow",
        icon: "lucide:workflow",
      },
    ],
    edges: [
      {
        id: "ai_coding_agent_to_local_repository",
        from: "ai_coding_agent",
        to: "local_repository",
        label: "edits source files",
        kind: "source_update",
      },
      {
        id: "local_repository_to_diagrampilot_cli",
        from: "local_repository",
        to: "diagrampilot_cli",
        label: "runs local commands",
        kind: "command",
      },
      {
        id: "diagrampilot_cli_to_pull_request",
        from: "diagrampilot_cli",
        to: "pull_request",
        label: "renders and checks artifacts",
        kind: "review_signal",
      },
    ],
  },
  "service-map": {
    version: 1,
    title: "Starter Service Boundary Map",
    description: "A starter service boundary DiagramPilot Source File.",
    direction: "right",
    nodes: [
      {
        id: "customer_app",
        label: "Customer App",
        kind: "frontend",
        icon: "lucide:smartphone",
      },
      {
        id: "edge_gateway",
        label: "Edge Gateway",
        kind: "gateway",
        icon: "lucide:router",
      },
      {
        id: "identity_service",
        label: "Identity Service",
        kind: "service",
        icon: "lucide:badge-check",
      },
      {
        id: "billing_service",
        label: "Billing Service",
        kind: "service",
        icon: "lucide:credit-card",
      },
      {
        id: "billing_db",
        label: "Billing DB",
        kind: "database",
        icon: "lucide:database",
      },
    ],
    groups: [
      {
        id: "public_boundary",
        label: "Public Boundary",
        contains: ["customer_app", "edge_gateway"],
        kind: "boundary",
        icon: "lucide:globe",
      },
      {
        id: "service_boundary",
        label: "Service Boundary",
        contains: ["identity_service", "billing_service", "billing_db"],
        kind: "boundary",
        icon: "lucide:boxes",
      },
    ],
    edges: [
      {
        id: "customer_app_to_edge_gateway",
        from: "customer_app",
        to: "edge_gateway",
        label: "HTTPS API calls",
        kind: "request",
      },
      {
        id: "edge_gateway_to_identity_service",
        from: "edge_gateway",
        to: "identity_service",
        label: "verifies token",
        kind: "request",
      },
      {
        id: "edge_gateway_to_billing_service",
        from: "edge_gateway",
        to: "billing_service",
        label: "forwards billing command",
        kind: "command",
      },
      {
        id: "billing_service_to_billing_db",
        from: "billing_service",
        to: "billing_db",
        label: "writes invoice state",
        kind: "write",
      },
    ],
  },
};

function isDiagramPilotSourceTemplateName(
  name: string,
): name is DiagramPilotSourceTemplateName {
  return (diagramPilotSourceTemplateNames as readonly string[]).includes(name);
}

function invalidTemplateMessage(name: string): string {
  return `Unsupported source template: ${name}`;
}

export function createDiagramPilotSourceTemplate(
  name: string,
): DiagramPilotSourceTemplateResult {
  if (!isDiagramPilotSourceTemplateName(name)) {
    return {
      ok: false,
      name,
      message: invalidTemplateMessage(name),
    };
  }

  const spec = sourceTemplates[name];
  const validation = validateDiagramSpec(spec);

  if (!validation.ok) {
    return {
      ok: false,
      name,
      message: `Built-in source template is invalid: ${name}`,
    };
  }

  return {
    ok: true,
    name,
    spec,
    content: serializeDiagramPilotSourceFile(spec),
  };
}
