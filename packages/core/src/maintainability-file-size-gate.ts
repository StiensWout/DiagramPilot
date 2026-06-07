import { readdir, readFile } from "node:fs/promises";
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

function isExcludedAuthoredPath(relativePath: string): boolean {
  const segments = relativePath.split("/");

  if (segments.some((segment) => ignoredDirectoryNames.has(segment))) {
    return true;
  }

  if (hasPathPrefix(relativePath, "website/src/content/docs")) {
    return true;
  }

  if (hasPathPrefix(relativePath, "schema")) {
    return true;
  }

  if (segments.includes("schema")) {
    return true;
  }

  if (relativePath.endsWith(".schema.json")) {
    return true;
  }

  if (hasPathPrefix(relativePath, ".scratch")) {
    return true;
  }

  if (relativePath.endsWith(".d.ts")) {
    return true;
  }

  if (/\.(generated|gen)\.[^/]+$/u.test(relativePath)) {
    return true;
  }

  return excludedFileExtensions.has(path.posix.extname(relativePath));
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
  const absoluteDirectory = path.join(rootPath, relativeDirectory);
  let entries;

  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const relativePath = normalizePathForGate(
      path.join(relativeDirectory, entry.name),
    );

    if (entry.isDirectory()) {
      if (!ignoredDirectoryNames.has(entry.name)) {
        await collectFiles(rootPath, relativePath, files);
      }

      continue;
    }

    if (entry.isFile() && shouldAuditFile(relativePath)) {
      files.push(relativePath);
    }
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
