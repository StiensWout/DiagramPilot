import { existsSync, statSync } from "node:fs";
import path from "node:path";

import type { RepoWorkflowConfigDiscoveryResult } from "./repo-workflow-config.js";

type RepoWorkflowConfigParser = (
  configPath: string,
) => RepoWorkflowConfigDiscoveryResult;

function configSearchStartDirectory(scopePath?: string): string {
  if (scopePath === undefined) {
    return process.cwd();
  }

  try {
    const stat = statSync(scopePath);

    return stat.isFile() ? path.dirname(scopePath) : scopePath;
  } catch {
    return path.dirname(path.resolve(scopePath));
  }
}

function emptyRepoWorkflowConfigDiscoveryResult(): RepoWorkflowConfigDiscoveryResult {
  return {
    ok: true,
  };
}

function discoverConfigInDirectory(
  directory: string,
  configFileName: string,
  parseConfig: RepoWorkflowConfigParser,
): RepoWorkflowConfigDiscoveryResult | undefined {
  const configPath = path.join(directory, configFileName);

  return existsSync(configPath) ? parseConfig(configPath) : undefined;
}

function nextConfigSearchDirectory(directory: string): string | undefined {
  if (existsSync(path.join(directory, ".git"))) {
    return undefined;
  }

  const parentDirectory = path.dirname(directory);

  return parentDirectory === directory ? undefined : parentDirectory;
}

export async function discoverRepoWorkflowConfigWithParser(
  scopePath: string | undefined,
  configFileName: string,
  parseConfig: RepoWorkflowConfigParser,
): Promise<RepoWorkflowConfigDiscoveryResult> {
  let directory = path.resolve(configSearchStartDirectory(scopePath));

  while (true) {
    const configResult = discoverConfigInDirectory(
      directory,
      configFileName,
      parseConfig,
    );

    if (configResult !== undefined) {
      return configResult;
    }

    const nextDirectory = nextConfigSearchDirectory(directory);

    if (nextDirectory === undefined) {
      return emptyRepoWorkflowConfigDiscoveryResult();
    }

    directory = nextDirectory;
  }
}
