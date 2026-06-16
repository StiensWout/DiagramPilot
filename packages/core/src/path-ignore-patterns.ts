import path from "node:path";

export function normalizeRepoRelativePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeIgnorePattern(pattern: string): string {
  return pattern
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/$/u, "/**");
}

function globSegmentToRegExpSource(segment: string): string {
  if (segment === "**") {
    return ".*";
  }

  return escapeRegExp(segment)
    .replace(/\\\*/gu, "[^/]*")
    .replace(/\\\?/gu, "[^/]");
}

function globPatternToRegExp(pattern: string): RegExp {
  const normalizedPattern = normalizeIgnorePattern(pattern);
  const expression = normalizedPattern
    .split("/")
    .map(globSegmentToRegExpSource)
    .join("/");

  return normalizedPattern.includes("/")
    ? new RegExp(`^${expression}$`, "u")
    : new RegExp(`(?:^|/)${expression}$`, "u");
}

export function createRelativePathIgnoreMatcher(
  patterns: readonly string[],
): (relativePath: string) => boolean {
  if (patterns.length === 0) {
    return () => false;
  }

  const expressions = patterns.map(globPatternToRegExp);

  return (relativePath) =>
    expressions.some((expression) => expression.test(relativePath));
}
