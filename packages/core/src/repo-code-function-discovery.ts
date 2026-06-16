import * as ts from "typescript";
import type { RepoDiscoveredImportEdge } from "./repo-code-discovery.js";

export type RepoDiscoveredCodeFunctionKind =
  | "function-declaration"
  | "function-expression"
  | "arrow-function";
export interface RepoDiscoveredCodeFunction {
  id: string;
  path: string;
  name: string;
  exported: boolean;
  exportName: string | null;
  kind: RepoDiscoveredCodeFunctionKind;
  source: string;
}
export interface RepoDiscoveredFunctionCallEdge {
  from: string;
  to: string;
  callee: string;
  source: string;
  kind: "direct";
}
export interface RepoDiscoveredFunctionDiagnostic {
  code: "dynamic-function-call" | "unresolved-function-call";
  path: string;
  functionId: string;
  callee: string;
  source: string;
  message: string;
}
export interface RepoCodeDiscoveryFunctionSummary {
  functions: readonly RepoDiscoveredCodeFunction[];
  functionCallEdges: readonly RepoDiscoveredFunctionCallEdge[];
  functionDiagnostics: readonly RepoDiscoveredFunctionDiagnostic[];
}
export interface RepoCodeFunctionDiscoveryModule {
  path: string;
  sourceFile: ts.SourceFile;
}
interface AnalyzedCodeFunction {
  body: ts.Node | undefined;
  summary: RepoDiscoveredCodeFunction;
}
interface AnalyzedFunctionModule extends RepoCodeFunctionDiscoveryModule {
  functions: readonly AnalyzedCodeFunction[];
}
interface FunctionImportBinding {
  fromPath: string;
  importedName: string;
  kind: "default" | "named" | "namespace";
  localName: string;
}
interface FunctionLookupContext {
  exportedFunctionIdByModuleAndName: ReadonlyMap<string, string>;
  functionIdByModuleAndName: ReadonlyMap<string, string>;
  importBindingsByModuleAndName: ReadonlyMap<string, FunctionImportBinding>;
}
interface FunctionCallCollection {
  diagnostics: RepoDiscoveredFunctionDiagnostic[];
  edges: RepoDiscoveredFunctionCallEdge[];
}
export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
    : false;
}

function stableIdToken(value: string): string {
  const token = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");

  return token === "" ? "unknown" : token;
}

function functionId(options: { modulePath: string; name: string }): string {
  return `fn_${stableIdToken(options.modulePath)}_${stableIdToken(options.name)}`;
}
function moduleNameKey(modulePath: string, name: string): string {
  return `${modulePath}\0${name}`;
}
function sourceReferenceForNode(
  modulePath: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): string {
  const position = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return `${modulePath}#L${position.line + 1}`;
}

function isLocalExportDeclaration(
  statement: ts.Statement,
): statement is ts.ExportDeclaration {
  return ts.isExportDeclaration(statement) && statement.moduleSpecifier === undefined;
}

function namedExportClause(
  exportClause: ts.ExportDeclaration["exportClause"],
): ts.NamedExports | undefined {
  if (exportClause === undefined) return undefined;
  return ts.isNamedExports(exportClause) ? exportClause : undefined;
}
function localNamedExportClause(statement: ts.Statement): ts.NamedExports | undefined {
  return isLocalExportDeclaration(statement)
    ? namedExportClause(statement.exportClause)
    : undefined;
}

function localNamedExportElements(
  statement: ts.Statement,
): readonly ts.ExportSpecifier[] {
  return [...(localNamedExportClause(statement)?.elements ?? [])];
}
function namedExportsFromSourceFile(sourceFile: ts.SourceFile): ReadonlySet<string> {
  return new Set(
    sourceFile.statements
      .flatMap(localNamedExportElements)
      .map((element) => (element.propertyName ?? element.name).text),
  );
}

function exportNameForFunction(options: {
  exportedNames: ReadonlySet<string>;
  name: string;
  node: ts.Node;
}): string | null {
  if (hasModifier(options.node, ts.SyntaxKind.DefaultKeyword)) return "default";
  if (hasModifier(options.node, ts.SyntaxKind.ExportKeyword)) return options.name;
  return options.exportedNames.has(options.name) ? options.name : null;
}

function analyzedFunction(options: {
  body: ts.Node | undefined;
  exportedNames: ReadonlySet<string>;
  kind: RepoDiscoveredCodeFunctionKind;
  modulePath: string;
  name: string;
  nameNode: ts.Node;
  node: ts.Node;
  sourceFile: ts.SourceFile;
}): AnalyzedCodeFunction {
  const exportName = exportNameForFunction({
    exportedNames: options.exportedNames,
    name: options.name,
    node: options.node,
  });

  return {
    body: options.body,
    summary: {
      id: functionId({ modulePath: options.modulePath, name: options.name }),
      path: options.modulePath,
      name: options.name,
      exported: exportName !== null,
      exportName,
      kind: options.kind,
      source: sourceReferenceForNode(
        options.modulePath,
        options.sourceFile,
        options.nameNode,
      ),
    },
  };
}

function functionDeclarationSummary(options: {
  exportedNames: ReadonlySet<string>;
  modulePath: string;
  node: ts.FunctionDeclaration;
  sourceFile: ts.SourceFile;
}): AnalyzedCodeFunction | undefined {
  if (options.node.name === undefined) return undefined;

  return analyzedFunction({
    body: options.node.body,
    exportedNames: options.exportedNames,
    kind: "function-declaration",
    modulePath: options.modulePath,
    name: options.node.name.text,
    nameNode: options.node.name,
    node: options.node,
    sourceFile: options.sourceFile,
  });
}

function variableFunctionKind(
  initializer: ts.Expression | undefined,
): RepoDiscoveredCodeFunctionKind | undefined {
  if (initializer === undefined) return undefined;
  if (ts.isArrowFunction(initializer)) return "arrow-function";
  return ts.isFunctionExpression(initializer) ? "function-expression" : undefined;
}

function variableFunctionSummary(options: {
  declaration: ts.VariableDeclaration;
  exportedNames: ReadonlySet<string>;
  modulePath: string;
  statement: ts.VariableStatement;
  sourceFile: ts.SourceFile;
}): AnalyzedCodeFunction | undefined {
  if (!ts.isIdentifier(options.declaration.name)) return undefined;

  const kind = variableFunctionKind(options.declaration.initializer);
  if (kind === undefined) return undefined;

  return analyzedFunction({
    body: options.declaration.initializer,
    exportedNames: options.exportedNames,
    kind,
    modulePath: options.modulePath,
    name: options.declaration.name.text,
    nameNode: options.declaration.name,
    node: options.statement,
    sourceFile: options.sourceFile,
  });
}

function variableStatementFunctions(options: {
  exportedNames: ReadonlySet<string>;
  modulePath: string;
  statement: ts.VariableStatement;
  sourceFile: ts.SourceFile;
}): readonly AnalyzedCodeFunction[] {
  return options.statement.declarationList.declarations
    .map((declaration) =>
      variableFunctionSummary({
        declaration,
        exportedNames: options.exportedNames,
        modulePath: options.modulePath,
        statement: options.statement,
        sourceFile: options.sourceFile,
      }),
    )
    .filter(
      (summary): summary is AnalyzedCodeFunction => summary !== undefined,
    );
}

function statementFunctions(options: {
  exportedNames: ReadonlySet<string>;
  modulePath: string;
  sourceFile: ts.SourceFile;
  statement: ts.Statement;
}): readonly AnalyzedCodeFunction[] {
  if (ts.isFunctionDeclaration(options.statement)) {
    const summary = functionDeclarationSummary({
      exportedNames: options.exportedNames,
      modulePath: options.modulePath,
      node: options.statement,
      sourceFile: options.sourceFile,
    });
    return summary === undefined ? [] : [summary];
  }

  return ts.isVariableStatement(options.statement)
    ? variableStatementFunctions({
        exportedNames: options.exportedNames,
        modulePath: options.modulePath,
        statement: options.statement,
        sourceFile: options.sourceFile,
      })
    : [];
}

function analyzeFunctionModule(
  module: RepoCodeFunctionDiscoveryModule,
): AnalyzedFunctionModule {
  const exportedNames = namedExportsFromSourceFile(module.sourceFile);

  return {
    ...module,
    functions: module.sourceFile.statements.flatMap((statement) =>
      statementFunctions({
        exportedNames,
        modulePath: module.path,
        sourceFile: module.sourceFile,
        statement,
      }),
    ),
  };
}

function importEdgeKey(from: string, specifier: string): string {
  return `${from}\0${specifier}`;
}

function createInternalImportTargetMap(
  importEdges: readonly RepoDiscoveredImportEdge[],
): ReadonlyMap<string, string> {
  return new Map(
    importEdges.flatMap((edge) =>
      edge.kind === "internal" && edge.to !== null
        ? [[importEdgeKey(edge.from, edge.specifier), edge.to]]
        : [],
    ),
  );
}

function relativeImportTarget(options: {
  importTargetByModuleAndSpecifier: ReadonlyMap<string, string>;
  modulePath: string;
  statement: ts.ImportDeclaration;
}): string | undefined {
  const specifier = ts.isStringLiteral(options.statement.moduleSpecifier)
    ? options.statement.moduleSpecifier.text
    : undefined;

  return specifier === undefined
    ? undefined
    : options.importTargetByModuleAndSpecifier.get(
        importEdgeKey(options.modulePath, specifier),
      );
}

function defaultImportBinding(options: {
  fromPath: string;
  importClause: ts.ImportClause;
}): FunctionImportBinding | undefined {
  const localName = options.importClause.name?.text;
  return localName === undefined
    ? undefined
    : {
        fromPath: options.fromPath,
        importedName: "default",
        kind: "default",
        localName,
      };
}

function namedImportBindings(options: {
  fromPath: string;
  namedBindings: ts.NamedImportBindings | undefined;
}): readonly FunctionImportBinding[] {
  if (options.namedBindings === undefined) return [];

  if (ts.isNamespaceImport(options.namedBindings)) {
    return [
      {
        fromPath: options.fromPath,
        importedName: "*",
        kind: "namespace",
        localName: options.namedBindings.name.text,
      },
    ];
  }

  return options.namedBindings.elements.map((element) => ({
    fromPath: options.fromPath,
    importedName: (element.propertyName ?? element.name).text,
    kind: "named",
    localName: element.name.text,
  }));
}

function importClauseBindings(options: {
  fromPath: string;
  importClause: ts.ImportClause | undefined;
}): readonly FunctionImportBinding[] {
  if (options.importClause === undefined) return [];

  return [
    defaultImportBinding({
      fromPath: options.fromPath,
      importClause: options.importClause,
    }),
    ...namedImportBindings({
      fromPath: options.fromPath,
      namedBindings: options.importClause.namedBindings,
    }),
  ].filter((binding): binding is FunctionImportBinding => binding !== undefined);
}

function importBindingsForStatement(options: {
  importTargetByModuleAndSpecifier: ReadonlyMap<string, string>;
  modulePath: string;
  statement: ts.Statement;
}): readonly FunctionImportBinding[] {
  if (!ts.isImportDeclaration(options.statement)) return [];

  const fromPath = relativeImportTarget({
    importTargetByModuleAndSpecifier: options.importTargetByModuleAndSpecifier,
    modulePath: options.modulePath,
    statement: options.statement,
  });
  return importClauseBindings({
    fromPath: fromPath ?? "",
    importClause: fromPath === undefined ? undefined : options.statement.importClause,
  });
}

function importBindingsForModule(options: {
  importTargetByModuleAndSpecifier: ReadonlyMap<string, string>;
  module: AnalyzedFunctionModule;
}): readonly FunctionImportBinding[] {
  return options.module.sourceFile.statements.flatMap((statement) =>
    importBindingsForStatement({
      importTargetByModuleAndSpecifier: options.importTargetByModuleAndSpecifier,
      modulePath: options.module.path,
      statement,
    }),
  );
}

function addFunctionLookups(options: {
  context: {
    exportedFunctionIdByModuleAndName: Map<string, string>;
    functionIdByModuleAndName: Map<string, string>;
  };
  module: AnalyzedFunctionModule;
}): void {
  for (const codeFunction of options.module.functions) {
    const summary = codeFunction.summary;
    options.context.functionIdByModuleAndName.set(
      moduleNameKey(summary.path, summary.name),
      summary.id,
    );
    if (summary.exportName !== null) {
      options.context.exportedFunctionIdByModuleAndName.set(
        moduleNameKey(summary.path, summary.exportName),
        summary.id,
      );
    }
  }
}

function addImportBindingLookups(options: {
  context: { importBindingsByModuleAndName: Map<string, FunctionImportBinding> };
  importTargetByModuleAndSpecifier: ReadonlyMap<string, string>;
  module: AnalyzedFunctionModule;
}): void {
  for (const binding of importBindingsForModule({
    importTargetByModuleAndSpecifier: options.importTargetByModuleAndSpecifier,
    module: options.module,
  })) {
    options.context.importBindingsByModuleAndName.set(
      moduleNameKey(options.module.path, binding.localName),
      binding,
    );
  }
}

function createFunctionLookupContext(options: {
  importEdges: readonly RepoDiscoveredImportEdge[];
  modules: readonly AnalyzedFunctionModule[];
}): FunctionLookupContext {
  const context = {
    exportedFunctionIdByModuleAndName: new Map<string, string>(),
    functionIdByModuleAndName: new Map<string, string>(),
    importBindingsByModuleAndName: new Map<string, FunctionImportBinding>(),
  };
  const importTargetByModuleAndSpecifier = createInternalImportTargetMap(
    options.importEdges,
  );

  for (const module of options.modules) {
    addFunctionLookups({ context, module });
    addImportBindingLookups({
      context,
      importTargetByModuleAndSpecifier,
      module,
    });
  }

  return context;
}

function callSourceReference(
  module: AnalyzedFunctionModule,
  callExpression: ts.CallExpression,
): string {
  return sourceReferenceForNode(module.path, module.sourceFile, callExpression);
}

function functionCallEdge(options: {
  callExpression: ts.CallExpression;
  callee: string;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
  toFunctionId: string;
}): RepoDiscoveredFunctionCallEdge {
  return {
    from: options.fromFunction.id,
    to: options.toFunctionId,
    callee: options.callee,
    source: callSourceReference(options.module, options.callExpression),
    kind: "direct",
  };
}

function unresolvedFunctionDiagnostic(options: {
  callExpression: ts.CallExpression;
  callee: string;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
}): RepoDiscoveredFunctionDiagnostic {
  return {
    code: "unresolved-function-call",
    path: options.module.path,
    functionId: options.fromFunction.id,
    callee: options.callee,
    source: callSourceReference(options.module, options.callExpression),
    message: `Function call ${options.callee} could not be resolved to a discovered function.`,
  };
}

function dynamicFunctionDiagnostic(options: {
  callExpression: ts.CallExpression;
  callee: string;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
}): RepoDiscoveredFunctionDiagnostic {
  return {
    code: "dynamic-function-call",
    path: options.module.path,
    functionId: options.fromFunction.id,
    callee: options.callee,
    source: callSourceReference(options.module, options.callExpression),
    message: `Dynamic function call ${options.callee} was not added as a certain call edge.`,
  };
}

function directFunctionIdForIdentifier(options: {
  context: FunctionLookupContext;
  module: AnalyzedFunctionModule;
  name: string;
}): string | undefined {
  const localFunctionId = options.context.functionIdByModuleAndName.get(
    moduleNameKey(options.module.path, options.name),
  );
  if (localFunctionId !== undefined) return localFunctionId;

  const binding = options.context.importBindingsByModuleAndName.get(
    moduleNameKey(options.module.path, options.name),
  );
  if (binding === undefined || binding.kind === "namespace") return undefined;

  return options.context.exportedFunctionIdByModuleAndName.get(
    moduleNameKey(binding.fromPath, binding.importedName),
  );
}

function directFunctionIdForPropertyAccess(options: {
  context: FunctionLookupContext;
  module: AnalyzedFunctionModule;
  propertyAccess: ts.PropertyAccessExpression;
}): string | undefined {
  const receiver = options.propertyAccess.expression;
  if (!ts.isIdentifier(receiver)) return undefined;

  const binding = options.context.importBindingsByModuleAndName.get(
    moduleNameKey(options.module.path, receiver.text),
  );
  if (binding === undefined || binding.kind !== "namespace") return undefined;

  return options.context.exportedFunctionIdByModuleAndName.get(
    moduleNameKey(binding.fromPath, options.propertyAccess.name.text),
  );
}

function directFunctionCallEdge(options: {
  callExpression: ts.CallExpression;
  context: FunctionLookupContext;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
}): RepoDiscoveredFunctionCallEdge | undefined {
  const expression = options.callExpression.expression;
  const toFunctionId = ts.isIdentifier(expression)
    ? directFunctionIdForIdentifier({
        context: options.context,
        module: options.module,
        name: expression.text,
      })
    : ts.isPropertyAccessExpression(expression)
      ? directFunctionIdForPropertyAccess({
          context: options.context,
          module: options.module,
          propertyAccess: expression,
        })
      : undefined;

  return toFunctionId === undefined
    ? undefined
    : functionCallEdge({
        callExpression: options.callExpression,
        callee: expression.getText(options.module.sourceFile),
        fromFunction: options.fromFunction,
        module: options.module,
        toFunctionId,
      });
}

function uncertainFunctionCallDiagnostic(options: {
  callExpression: ts.CallExpression;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
}): RepoDiscoveredFunctionDiagnostic | undefined {
  const expression = options.callExpression.expression;
  const callee = expression.getText(options.module.sourceFile);

  if (ts.isElementAccessExpression(expression)) {
    return dynamicFunctionDiagnostic({ ...options, callee });
  }

  return ts.isIdentifier(expression)
    ? unresolvedFunctionDiagnostic({ ...options, callee })
    : undefined;
}

function collectFunctionCall(options: {
  callExpression: ts.CallExpression;
  collection: FunctionCallCollection;
  context: FunctionLookupContext;
  fromFunction: RepoDiscoveredCodeFunction;
  module: AnalyzedFunctionModule;
}): void {
  const edge = directFunctionCallEdge(options);
  if (edge !== undefined) {
    options.collection.edges.push(edge);
    return;
  }

  const diagnostic = uncertainFunctionCallDiagnostic(options);
  if (diagnostic !== undefined) options.collection.diagnostics.push(diagnostic);
}

function collectFunctionCalls(options: {
  collection: FunctionCallCollection;
  context: FunctionLookupContext;
  functionBody: AnalyzedCodeFunction;
  module: AnalyzedFunctionModule;
}): void {
  const body = options.functionBody.body;
  if (body === undefined) return;

  const visit = (node: ts.Node): void => {
    if (node !== body && ts.isFunctionLike(node)) return;

    if (ts.isCallExpression(node)) {
      collectFunctionCall({
        callExpression: node,
        collection: options.collection,
        context: options.context,
        fromFunction: options.functionBody.summary,
        module: options.module,
      });
    }

    ts.forEachChild(node, visit);
  };

  visit(body);
}

function collectFunctionCallRelationships(options: {
  context: FunctionLookupContext;
  modules: readonly AnalyzedFunctionModule[];
}): FunctionCallCollection {
  const collection: FunctionCallCollection = {
    diagnostics: [],
    edges: [],
  };

  for (const module of options.modules) {
    for (const functionBody of module.functions) {
      collectFunctionCalls({
        collection,
        context: options.context,
        functionBody,
        module,
      });
    }
  }

  return collection;
}

export function discoverCodeFunctions(options: {
  importEdges: readonly RepoDiscoveredImportEdge[];
  modules: readonly RepoCodeFunctionDiscoveryModule[];
}): RepoCodeDiscoveryFunctionSummary {
  const modules = options.modules.map(analyzeFunctionModule);
  const context = createFunctionLookupContext({
    importEdges: options.importEdges,
    modules,
  });
  const relationships = collectFunctionCallRelationships({ context, modules });

  return {
    functions: modules.flatMap((module) =>
      module.functions.map((codeFunction) => codeFunction.summary),
    ),
    functionCallEdges: relationships.edges,
    functionDiagnostics: relationships.diagnostics,
  };
}
