import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  discoverRepoWorkflowConfig,
  type RepoWorkflowConfig,
  type RepoWorkflowConfigFailure,
} from "./repo-workflow-config.js";

export type RepoDiscoveryTarget = "code" | "packages";

export type RepoDiscoveryPreset = "typescript" | "node-package" | "monorepo";

export interface RepoDiscoveryOptions {
  scopePath?: string;
  target: RepoDiscoveryTarget;
  preset?: RepoDiscoveryPreset;
}

export interface RepoDiscoveryIgnoreSource {
  source: "builtin" | "gitignore" | "config";
  path?: string;
  patterns: readonly string[];
}

export interface RepoDiscoverySummary {
  ok: true;
  command: "discover";
  target: RepoDiscoveryTarget;
  mode: "summary";
  preset: RepoDiscoveryPreset;
  include: readonly string[];
  exclude: readonly string[];
  ignoreSources: readonly RepoDiscoveryIgnoreSource[];
  readOnly: true;
}

export type RepoDiscoveryFailure = RepoWorkflowConfigFailure;

export type RepoDiscoveryResult =
  | RepoDiscoverySummary
  | {
      ok: false;
      failure: RepoDiscoveryFailure;
    };

export const repoDiscoveryPresets = [
  "typescript",
  "node-package",
  "monorepo",
] as const satisfies readonly RepoDiscoveryPreset[];

const builtinIgnorePatterns = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  ".vite/**",
  ".turbo/**",
] as const;

const codeIncludePatterns = [
  "**/*.js",
  "**/*.jsx",
  "**/*.ts",
  "**/*.tsx",
] as const;

const packageIncludePatterns = ["package.json", "packages/*/package.json"] as const;

const defaultPresetByTarget: Readonly<Record<RepoDiscoveryTarget, RepoDiscoveryPreset>> = {
  code: "typescript",
  packages: "node-package",
};

function includePatternsForTarget(target: RepoDiscoveryTarget): readonly string[] {
  return target === "code" ? codeIncludePatterns : packageIncludePatterns;
}

function scopeDirectory(scopePath: string | undefined): string {
  if (scopePath === undefined) return process.cwd();

  const absolutePath = path.resolve(scopePath);

  try {
    const stat = statSync(absolutePath);
    return stat.isFile() ? path.dirname(absolutePath) : absolutePath;
  } catch {
    return path.dirname(absolutePath);
  }
}

function configIgnoreSource(
  config: RepoWorkflowConfig | undefined,
): RepoDiscoveryIgnoreSource | undefined {
  if (config === undefined || config.sources.ignore.length === 0) {
    return undefined;
  }

  return {
    source: "config",
    path: path.relative(config.directory, config.path),
    patterns: config.sources.ignore,
  };
}

function parseGitignorePatterns(content: string): string[] {
  return content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith("!"));
}

function gitignoreIgnoreSource(directory: string): RepoDiscoveryIgnoreSource | undefined {
  const gitignorePath = path.join(directory, ".gitignore");

  if (!existsSync(gitignorePath)) {
    return undefined;
  }

  const patterns = parseGitignorePatterns(readFileSync(gitignorePath, "utf8"));

  if (patterns.length === 0) {
    return undefined;
  }

  return {
    source: "gitignore",
    path: path.relative(directory, gitignorePath),
    patterns,
  };
}

function collectIgnoreSources(options: {
  config?: RepoWorkflowConfig;
  directory: string;
}): readonly RepoDiscoveryIgnoreSource[] {
  return [
    {
      source: "builtin",
      patterns: builtinIgnorePatterns,
    },
    gitignoreIgnoreSource(options.directory),
    configIgnoreSource(options.config),
  ].filter((source): source is RepoDiscoveryIgnoreSource => source !== undefined);
}

function combineIgnorePatterns(
  sources: readonly RepoDiscoveryIgnoreSource[],
): readonly string[] {
  const seen = new Set<string>();
  const patterns: string[] = [];

  for (const source of sources) {
    for (const pattern of source.patterns) {
      if (seen.has(pattern)) continue;
      seen.add(pattern);
      patterns.push(pattern);
    }
  }

  return patterns;
}

function effectivePreset(options: {
  config?: RepoWorkflowConfig;
  preset?: RepoDiscoveryPreset;
  target: RepoDiscoveryTarget;
}): RepoDiscoveryPreset {
  return (
    options.preset ??
    options.config?.discovery?.preset ??
    defaultPresetByTarget[options.target]
  );
}

export async function discoverRepo(
  options: RepoDiscoveryOptions,
): Promise<RepoDiscoveryResult> {
  const configResult = await discoverRepoWorkflowConfig(options.scopePath);

  if (!configResult.ok) {
    return {
      ok: false,
      failure: configResult.failure,
    };
  }

  const directory = configResult.config?.directory ?? scopeDirectory(options.scopePath);
  const ignoreSources = collectIgnoreSources({
    config: configResult.config,
    directory,
  });

  return {
    ok: true,
    command: "discover",
    target: options.target,
    mode: "summary",
    preset: effectivePreset({
      config: configResult.config,
      preset: options.preset,
      target: options.target,
    }),
    include: includePatternsForTarget(options.target),
    exclude: combineIgnorePatterns(ignoreSources),
    ignoreSources,
    readOnly: true,
  };
}
