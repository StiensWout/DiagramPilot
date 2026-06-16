import { readFileSync, readdirSync, type Dirent } from "node:fs";
import path from "node:path";

import * as ts from "typescript";

import {
  createRelativePathIgnoreMatcher,
  normalizeRepoRelativePath,
} from "./path-ignore-patterns.js";

export type RepoDiscoveredCodeClassification =
  | "source"
  | "test"
  | "generated"
  | "cli-entrypoint"
  | "route-like";

export interface RepoDiscoveredCodeModule {
  path: string;
  extension: ".ts" | ".tsx" | ".js" | ".jsx" | ".mts" | ".cts";
  classifications: readonly RepoDiscoveredCodeClassification[];
  importSpecifiers: readonly string[];
  exportCount: number;
}

export interface RepoDiscoveredImportEdge {
  from: string;
  specifier: string;
  to: string | null;
  kind: "internal" | "external" | "unresolved";
}

export interface RepoDiscoveredUnresolvedImport {
  from: string;
  specifier: string;
}

export interface RepoIgnoredCodeFile {
  path: string;
  classifications: readonly RepoDiscoveredCodeClassification[];
  reason: "test" | "generated" | "ignored";
}

export interface RepoCodeDiscoverySummary {
  files: readonly string[];
  modules: readonly RepoDiscoveredCodeModule[];
  importEdges: readonly RepoDiscoveredImportEdge[];
  unresolvedImports: readonly RepoDiscoveredUnresolvedImport[];
  ignoredFiles: readonly RepoIgnoredCodeFile[];
}

export interface RepoCodeDiscoveryOptions {
  directory: string;
  exclude: readonly string[];
  includeTests?: boolean;
}

interface CodeFileCandidate {
  absolutePath: string;
  relativePath: string;
  extension: RepoDiscoveredCodeModule["extension"];
}

interface AnalyzedCodeModule extends RepoDiscoveredCodeModule {
  absolutePath: string;
}

const supportedCodeExtensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
] as const satisfies readonly RepoDiscoveredCodeModule["extension"][];

const supportedCodeExtensionSet = new Set<string>(supportedCodeExtensions);

const scriptKindByExtension: Readonly<
  Record<RepoDiscoveredCodeModule["extension"], ts.ScriptKind>
> = {
  ".js": ts.ScriptKind.JS,
  ".jsx": ts.ScriptKind.JSX,
  ".ts": ts.ScriptKind.TS,
  ".tsx": ts.ScriptKind.TSX,
  ".mts": ts.ScriptKind.TS,
  ".cts": ts.ScriptKind.TS,
};

const directoryNamesExcludedFromCodeDiscovery = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".vite",
  ".turbo",
]);

function codeExtensionForPath(
  filePath: string,
): RepoDiscoveredCodeModule["extension"] | undefined {
  const extension = path.extname(filePath);
  return supportedCodeExtensionSet.has(extension)
    ? (extension as RepoDiscoveredCodeModule["extension"])
    : undefined;
}

function shouldVisitDirectory(entryName: string): boolean {
  return !directoryNamesExcludedFromCodeDiscovery.has(entryName);
}

function codeFileCandidateForEntry(options: {
  directory: string;
  absolutePath: string;
  entryName: string;
  isFile: boolean;
}): CodeFileCandidate | undefined {
  if (!options.isFile) return undefined;

  const extension = codeExtensionForPath(options.entryName);
  if (extension === undefined) return undefined;

  return {
    absolutePath: options.absolutePath,
    extension,
    relativePath: normalizeRepoRelativePath(
      path.relative(options.directory, options.absolutePath),
    ),
  };
}

function childDirectoryForEntry(
  entry: Dirent,
  absolutePath: string,
): string | undefined {
  return entry.isDirectory() && shouldVisitDirectory(entry.name)
    ? absolutePath
    : undefined;
}

function collectCodeDirectoryEntry(options: {
  directory: string;
  entry: Dirent;
  absolutePath: string;
  files: CodeFileCandidate[];
  visitDirectory(directoryPath: string): void;
}): void {
  const childDirectory = childDirectoryForEntry(
    options.entry,
    options.absolutePath,
  );
  if (childDirectory !== undefined) {
    options.visitDirectory(childDirectory);
    return;
  }

  const candidate = codeFileCandidateForEntry({
    absolutePath: options.absolutePath,
    directory: options.directory,
    entryName: options.entry.name,
    isFile: options.entry.isFile(),
  });
  if (candidate !== undefined) options.files.push(candidate);
}

function collectCodeFiles(directory: string): readonly CodeFileCandidate[] {
  const files: CodeFileCandidate[] = [];

  function visitDirectory(directoryPath: string): void {
    for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
      collectCodeDirectoryEntry({
        absolutePath: path.join(directoryPath, entry.name),
        directory,
        entry,
        files,
        visitDirectory,
      });
    }
  }

  visitDirectory(directory);
  return files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
}

function isTestPath(relativePath: string): boolean {
  const basename = path.posix.basename(relativePath);
  return (
    /(?:^|\/)(?:__tests__|tests?|spec)\//u.test(relativePath) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(basename)
  );
}

function isGeneratedPath(relativePath: string): boolean {
  const basename = path.posix.basename(relativePath);
  return (
    /(?:^|\/)(?:generated|__generated__)\//u.test(relativePath) ||
    /\.(?:generated|gen)\.[cm]?[jt]sx?$/u.test(basename)
  );
}

function isRouteLikePath(relativePath: string): boolean {
  const basename = path.posix.basename(relativePath);
  return (
    /(?:^|\/)(?:app|pages|routes)\//u.test(relativePath) ||
    /^route\.[cm]?[jt]sx?$/u.test(basename)
  );
}

function hasNodeHashbang(fileText: string): boolean {
  const firstLine = fileText.split(/\r?\n/u, 1)[0] ?? "";
  return /^#!.*\bnode\b/u.test(firstLine);
}

function isCliEntrypointPath(relativePath: string, fileText: string): boolean {
  return relativePath.startsWith("bin/") || hasNodeHashbang(fileText);
}

function compactClassifications(
  values: readonly (RepoDiscoveredCodeClassification | undefined)[],
): readonly RepoDiscoveredCodeClassification[] {
  return values.filter(
    (value): value is RepoDiscoveredCodeClassification => value !== undefined,
  );
}

function primaryClassificationsForPath(
  relativePath: string,
): readonly RepoDiscoveredCodeClassification[] {
  const classifications = compactClassifications([
    isTestPath(relativePath) ? "test" : undefined,
    isGeneratedPath(relativePath) ? "generated" : undefined,
  ]);

  return classifications.length > 0 ? classifications : ["source"];
}

function classifyCodeFile(
  file: CodeFileCandidate,
  fileText: string,
): readonly RepoDiscoveredCodeClassification[] {
  return [
    ...primaryClassificationsForPath(file.relativePath),
    ...compactClassifications([
      isCliEntrypointPath(file.relativePath, fileText)
        ? "cli-entrypoint"
        : undefined,
      isRouteLikePath(file.relativePath) ? "route-like" : undefined,
    ]),
  ];
}

function ignoreReasonForAcceptedClassifications(
  classifications: readonly RepoDiscoveredCodeClassification[],
  includeTests: boolean,
): RepoIgnoredCodeFile["reason"] | undefined {
  if (classifications.includes("generated")) return "generated";
  return !includeTests && classifications.includes("test") ? "test" : undefined;
}

function ignoreReasonForClassifications(
  classifications: readonly RepoDiscoveredCodeClassification[],
  options: { includeTests: boolean; isIgnored: boolean },
): RepoIgnoredCodeFile["reason"] | undefined {
  return options.isIgnored
    ? "ignored"
    : ignoreReasonForAcceptedClassifications(
        classifications,
        options.includeTests,
      );
}

function scriptKindForExtension(
  extension: RepoDiscoveredCodeModule["extension"],
): ts.ScriptKind {
  return scriptKindByExtension[extension];
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
    : false;
}

function countVariableStatementExports(statement: ts.VariableStatement): number {
  return hasModifier(statement, ts.SyntaxKind.ExportKeyword)
    ? statement.declarationList.declarations.length
    : 0;
}

function countExportDeclaration(statement: ts.ExportDeclaration): number {
  const exportClause = statement.exportClause;

  if (exportClause === undefined) {
    return 1;
  }

  return ts.isNamedExports(exportClause) ? exportClause.elements.length : 1;
}

function countDeclarationExport(statement: ts.Statement): number {
  return hasModifier(statement, ts.SyntaxKind.ExportKeyword) ? 1 : 0;
}

function countStatementExports(statement: ts.Statement): number {
  if (ts.isExportAssignment(statement)) return 1;
  if (ts.isExportDeclaration(statement)) return countExportDeclaration(statement);
  if (ts.isVariableStatement(statement)) return countVariableStatementExports(statement);
  return countDeclarationExport(statement);
}

function moduleSpecifierText(expression: ts.Expression): string | undefined {
  return ts.isStringLiteral(expression) ? expression.text : undefined;
}

function importSpecifierFromStatement(statement: ts.Statement): string | undefined {
  if (ts.isImportDeclaration(statement)) {
    return moduleSpecifierText(statement.moduleSpecifier);
  }

  if (ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined) {
    return moduleSpecifierText(statement.moduleSpecifier);
  }

  return undefined;
}

function analyzeCodeModule(file: CodeFileCandidate): AnalyzedCodeModule {
  const fileText = readFileSync(file.absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    file.absolutePath,
    fileText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForExtension(file.extension),
  );
  const importSpecifiers: string[] = [];
  let exportCount = 0;

  for (const statement of sourceFile.statements) {
    const specifier = importSpecifierFromStatement(statement);
    if (specifier !== undefined) importSpecifiers.push(specifier);
    exportCount += countStatementExports(statement);
  }

  return {
    absolutePath: file.absolutePath,
    path: file.relativePath,
    extension: file.extension,
    classifications: classifyCodeFile(file, fileText),
    importSpecifiers,
    exportCount,
  };
}

function isRelativeModuleSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function moduleResolutionCandidates(
  fromModule: AnalyzedCodeModule,
  specifier: string,
): readonly string[] {
  const basePath = path.resolve(path.dirname(fromModule.absolutePath), specifier);
  const extension = path.extname(basePath);

  if (supportedCodeExtensionSet.has(extension)) {
    return [basePath];
  }

  return [
    ...supportedCodeExtensions.map((candidateExtension) => basePath + candidateExtension),
    ...supportedCodeExtensions.map((candidateExtension) =>
      path.join(basePath, `index${candidateExtension}`),
    ),
  ];
}

function resolveInternalImport(
  fromModule: AnalyzedCodeModule,
  specifier: string,
  modulePathByAbsolutePath: ReadonlyMap<string, string>,
): string | undefined {
  for (const candidate of moduleResolutionCandidates(fromModule, specifier)) {
    const resolvedPath = modulePathByAbsolutePath.get(candidate);
    if (resolvedPath !== undefined) return resolvedPath;
  }

  return undefined;
}

function importEdgeForSpecifier(
  fromModule: AnalyzedCodeModule,
  specifier: string,
  modulePathByAbsolutePath: ReadonlyMap<string, string>,
): RepoDiscoveredImportEdge {
  if (!isRelativeModuleSpecifier(specifier)) {
    return {
      from: fromModule.path,
      specifier,
      to: null,
      kind: "external",
    };
  }

  const resolvedPath = resolveInternalImport(
    fromModule,
    specifier,
    modulePathByAbsolutePath,
  );

  return {
    from: fromModule.path,
    specifier,
    to: resolvedPath ?? null,
    kind: resolvedPath === undefined ? "unresolved" : "internal",
  };
}

function createImportEdges(
  modules: readonly AnalyzedCodeModule[],
): readonly RepoDiscoveredImportEdge[] {
  const modulePathByAbsolutePath = new Map(
    modules.map((module) => [module.absolutePath, module.path]),
  );

  return modules.flatMap((module) =>
    module.importSpecifiers.map((specifier) =>
      importEdgeForSpecifier(module, specifier, modulePathByAbsolutePath),
    ),
  );
}

function ignoredCodeFileForCandidate(
  file: CodeFileCandidate,
  options: { includeTests: boolean; isIgnored: boolean },
): RepoIgnoredCodeFile | undefined {
  const fileText = readFileSync(file.absolutePath, "utf8");
  const classifications = classifyCodeFile(file, fileText);
  const reason = ignoreReasonForClassifications(classifications, options);

  return reason === undefined
    ? undefined
    : {
        path: file.relativePath,
        classifications,
        reason,
      };
}

function shouldIncludeCodeFile(
  ignoredFile: RepoIgnoredCodeFile | undefined,
): ignoredFile is undefined {
  return ignoredFile === undefined;
}

export function discoverCodeModules(
  options: RepoCodeDiscoveryOptions,
): RepoCodeDiscoverySummary {
  const includeTests = options.includeTests ?? false;
  const isIgnored = createRelativePathIgnoreMatcher(options.exclude);
  const candidates = collectCodeFiles(options.directory);
  const ignoredFiles: RepoIgnoredCodeFile[] = [];
  const modules: AnalyzedCodeModule[] = [];

  for (const candidate of candidates) {
    const ignoredFile = ignoredCodeFileForCandidate(candidate, {
      includeTests,
      isIgnored: isIgnored(candidate.relativePath),
    });

    if (shouldIncludeCodeFile(ignoredFile)) {
      modules.push(analyzeCodeModule(candidate));
    } else {
      ignoredFiles.push(ignoredFile);
    }
  }

  const importEdges = createImportEdges(modules);

  return {
    files: modules.map((module) => module.path),
    modules: modules.map(({ absolutePath: _absolutePath, ...module }) => module),
    importEdges,
    unresolvedImports: importEdges
      .filter((edge) => edge.kind === "unresolved")
      .map((edge) => ({ from: edge.from, specifier: edge.specifier })),
    ignoredFiles,
  };
}
