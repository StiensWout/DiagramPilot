import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

export interface MaintainabilityFileSizeGateDefinition {
  maxLineCount: number;
  includedPathGlobs: readonly string[];
  excludedPathGlobs: readonly string[];
}

export interface MaintainabilityFileSizeAuditFile {
  path: string;
  lineCount: number;
}

export interface MaintainabilityFileSizeViolation
  extends MaintainabilityFileSizeAuditFile {
  maxLineCount: number;
}

export interface MaintainabilityFileSizeAuditResult {
  ok: boolean;
  gate: MaintainabilityFileSizeGateDefinition;
  checkedFiles: readonly MaintainabilityFileSizeAuditFile[];
  violations: readonly MaintainabilityFileSizeViolation[];
}

export const MAINTAINABILITY_FILE_SIZE_GATE: MaintainabilityFileSizeGateDefinition =
  {
    maxLineCount: 500,
    includedPathGlobs: [
      "packages/**/*.ts",
      "test/**/*.mjs",
      "website/src/**/*",
      "website/scripts/**/*",
    ],
    excludedPathGlobs: [
      "**/.git/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.vite/**",
      "**/.turbo/**",
      "**/.astro/**",
      "website/src/content/docs/**",
      "schema/**",
      "**/schema/**",
      "**/*.schema.json",
      ".scratch/**",
      "**/*.md",
      "**/*.mdx",
      "**/*.svg",
      "**/*.png",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.gif",
      "**/*.webp",
      "**/*.avif",
      "**/*.ico",
      "**/*.d.ts",
      "**/*.generated.*",
      "**/*.gen.*",
      "**/generated/**",
      "**/vendor/**",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lock",
      "bun.lockb",
    ],
  };

const includedRoots = [
  "packages",
  "test",
  "website/src",
  "website/scripts",
] as const;

const ignoredDirectoryNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
  ".turbo",
  ".astro",
  "generated",
  "vendor",
]);

const excludedFileExtensions = new Set([
  ".md",
  ".mdx",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
]);

type PathPredicate = (relativePath: string) => boolean;

function normalizePathForGate(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function hasPathPrefix(filePath: string, prefix: string): boolean {
  return filePath === prefix || filePath.startsWith(`${prefix}/`);
}

function isIncludedAuthoredPath(relativePath: string): boolean {
  if (hasPathPrefix(relativePath, "packages")) {
    return relativePath.endsWith(".ts");
  }

  if (hasPathPrefix(relativePath, "test")) {
    return relativePath.endsWith(".mjs");
  }

  return (
    hasPathPrefix(relativePath, "website/src") ||
    hasPathPrefix(relativePath, "website/scripts")
  );
}

function hasIgnoredDirectorySegment(relativePath: string): boolean {
  return relativePath
    .split("/")
    .some((segment) => ignoredDirectoryNames.has(segment));
}

const excludedAuthoredPathPredicates: readonly PathPredicate[] = [
  hasIgnoredDirectorySegment,
  (relativePath) => hasPathPrefix(relativePath, "website/src/content/docs"),
  (relativePath) => hasPathPrefix(relativePath, "schema"),
  (relativePath) => relativePath.split("/").includes("schema"),
  (relativePath) => relativePath.endsWith(".schema.json"),
  (relativePath) => hasPathPrefix(relativePath, ".scratch"),
  (relativePath) => relativePath.endsWith(".d.ts"),
  (relativePath) => /\.(generated|gen)\.[^/]+$/u.test(relativePath),
  (relativePath) => excludedFileExtensions.has(path.posix.extname(relativePath)),
];

function isExcludedAuthoredPath(relativePath: string): boolean {
  return excludedAuthoredPathPredicates.some((predicate) =>
    predicate(relativePath),
  );
}

function shouldAuditFile(relativePath: string): boolean {
  return (
    isIncludedAuthoredPath(relativePath) &&
    !isExcludedAuthoredPath(relativePath)
  );
}

function countLines(content: string): number {
  const lines = content.split(/\r\n|\n|\r/u);

  return lines.at(-1) === "" ? lines.length - 1 : lines.length;
}

async function collectFiles(
  rootPath: string,
  relativeDirectory: string,
  files: string[],
): Promise<void> {
  const entries = await readDirectoryIfPresent(rootPath, relativeDirectory);

  if (entries === undefined) return;

  for (const entry of entries) {
    await collectFileEntry(rootPath, relativeDirectory, entry, files);
  }
}

async function readDirectoryIfPresent(
  rootPath: string,
  relativeDirectory: string,
) {
  try {
    return await readdir(path.join(rootPath, relativeDirectory), {
      withFileTypes: true,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;

    throw error;
  }
}

async function collectFileEntry(
  rootPath: string,
  relativeDirectory: string,
  entry: Dirent,
  files: string[],
): Promise<void> {
  const relativePath = normalizePathForGate(
    path.join(relativeDirectory, entry.name),
  );

  if (entry.isDirectory() && !ignoredDirectoryNames.has(entry.name)) {
    await collectFiles(rootPath, relativePath, files);
    return;
  }

  if (entry.isFile() && shouldAuditFile(relativePath)) {
    files.push(relativePath);
  }
}

export async function auditMaintainabilityFileSizes(
  rootPath = process.cwd(),
): Promise<MaintainabilityFileSizeAuditResult> {
  const files: string[] = [];

  for (const includedRoot of includedRoots) {
    await collectFiles(rootPath, includedRoot, files);
  }

  const checkedFiles: MaintainabilityFileSizeAuditFile[] = [];

  for (const relativePath of [...new Set(files)].sort()) {
    const content = await readFile(path.join(rootPath, relativePath), "utf8");

    checkedFiles.push({
      path: relativePath,
      lineCount: countLines(content),
    });
  }

  const violations = checkedFiles
    .filter(
      (file) =>
        file.lineCount > MAINTAINABILITY_FILE_SIZE_GATE.maxLineCount,
    )
    .map((file) => ({
      ...file,
      maxLineCount: MAINTAINABILITY_FILE_SIZE_GATE.maxLineCount,
    }));

  return {
    ok: violations.length === 0,
    gate: MAINTAINABILITY_FILE_SIZE_GATE,
    checkedFiles,
    violations,
  };
}
