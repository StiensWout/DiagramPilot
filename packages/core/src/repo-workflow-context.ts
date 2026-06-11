import type {
  RepoWorkflowConfig,
  RepoWorkflowConfigDiscoveryResult,
  RepoWorkflowConfigFailure,
} from "./repo-workflow-config.js";
import {
  configuredExplicitSourcesForScope,
  configuredSourceDiscoveryOptions,
  mergeDiscoveredAndConfiguredSources,
} from "./repo-workflow-configured-artifacts.js";
import type {
  DiagramPilotSourceDiscoveryFailure,
  DiagramPilotSourceDiscoveryOptions,
  DiagramPilotSourceDiscoveryResult,
  DiagramPilotSourceDiscoveryScope,
  DiscoveredDiagramPilotSourceFile,
} from "./source-discovery.js";

export interface RepoWorkflowContext {
  config?: RepoWorkflowConfig;
  currentWorkingDirectory: string;
  scope: DiagramPilotSourceDiscoveryScope;
  sources: readonly DiscoveredDiagramPilotSourceFile[];
}

export interface RepoWorkflowContextDependencies {
  discoverRepoWorkflowConfig?(
    scopePath?: string,
  ): Promise<RepoWorkflowConfigDiscoveryResult>;
  discoverDiagramPilotSourceFiles(
    scopePath?: string,
    options?: DiagramPilotSourceDiscoveryOptions,
  ): Promise<DiagramPilotSourceDiscoveryResult>;
  getCurrentWorkingDirectory(): string;
}

export type RepoWorkflowContextFailure =
  | DiagramPilotSourceDiscoveryFailure
  | RepoWorkflowConfigFailure;

export type RepoWorkflowContextResult =
  | {
      ok: true;
      context: RepoWorkflowContext;
    }
  | {
      ok: false;
      failure: RepoWorkflowContextFailure;
    };

export async function discoverRepoWorkflowContext(
  scopePath: string | undefined,
  dependencies: RepoWorkflowContextDependencies,
): Promise<RepoWorkflowContextResult> {
  const configResult =
    dependencies.discoverRepoWorkflowConfig === undefined
      ? { ok: true as const }
      : await dependencies.discoverRepoWorkflowConfig(scopePath);

  if (!configResult.ok) {
    return {
      ok: false,
      failure: configResult.failure,
    };
  }

  const discoveryResult = await dependencies.discoverDiagramPilotSourceFiles(
    scopePath,
    configuredSourceDiscoveryOptions(configResult.config),
  );

  if (!discoveryResult.ok) {
    return {
      ok: false,
      failure: discoveryResult.failure,
    };
  }

  return {
    ok: true,
    context: {
      config: configResult.config,
      currentWorkingDirectory: dependencies.getCurrentWorkingDirectory(),
      scope: discoveryResult.scope,
      sources: mergeDiscoveredAndConfiguredSources(
        discoveryResult.sources,
        configuredExplicitSourcesForScope(configResult.config, discoveryResult.scope),
      ),
    },
  };
}
