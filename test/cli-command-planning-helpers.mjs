import assert from "node:assert/strict";

import { diffDiagramSpecs } from "../packages/core/dist/index.js";

export function validLoadResult(sourcePath = "docs/architecture.dp.yaml") {
  return {
    ok: true,
    source: {
      format: "yaml",
      path: sourcePath,
      content: "version: 1\n",
      value: {
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
    },
    spec: {
      version: 1,
      title: "Checkout Architecture",
      nodes: [{ id: "web_app", label: "Web App" }],
    },
  };
}

export function assertJsonFailurePlan(plan) {
  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);
  return JSON.parse(plan.stdout);
}

export function assertStderrFailurePlan(plan, stderrPatterns = []) {
  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  for (const pattern of stderrPatterns) {
    assert.match(plan.stderr, pattern);
  }
}

export function readFailure(path = "docs/missing.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "read",
      path,
      message: "ENOENT: no such file or directory",
    },
  };
}

export function parseFailure(path = "docs/broken.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "parse",
      format: "yaml",
      path,
      message: "Unexpected end of file",
      line: 3,
      column: 1,
    },
  };
}

export function validationFailure(path = "docs/invalid.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "validation",
      source: {
        format: "yaml",
        path,
        value: {
          version: 1,
          nodes: [{ id: "web_app", label: "Web App" }],
        },
      },
      errors: [
        {
          path: "title",
          message: "Missing required top-level field: title.",
          expected: "Required top-level fields: version, title, nodes.",
          suggestion: "Add a title field.",
        },
      ],
    },
  };
}

export const testRenderer = { name: "@terrastruct/d2", version: "0.1.33" };

function validationError(overrides = {}) {
  return {
    path: "title",
    message: "Missing required top-level field: title.",
    expected: "Required top-level fields: version, title, nodes.",
    suggestion: "Add a title field.",
    ...overrides,
  };
}

export function freshWorkflowSource(options = {}) {
  const {
    sourcePath = "docs/architecture.dp.yaml",
    artifactPath = "docs/architecture.svg",
    provenanceSourcePath = sourcePath,
    sourceSha256 = "hash",
    diagramPilotVersion = "0.1.0",
  } = options;

  return {
    sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    artifact: {
      status: "fresh",
      path: artifactPath,
      provenance: {
        sourcePath: provenanceSourcePath,
        sourceSha256,
        diagramPilotVersion,
        renderer: testRenderer,
      },
    },
  };
}

export function invalidWorkflowSource(options = {}) {
  const { sourcePath = "docs/invalid.dp.yaml", errors = [validationError()] } =
    options;

  return {
    sourcePath,
    validation: {
      ok: false,
      errors,
    },
    artifact: {
      status: "unchecked",
    },
  };
}

export function missingArtifactWorkflowSource(options = {}) {
  const {
    sourcePath = "docs/missing.dp.yaml",
    artifactPath = "docs/missing.svg",
  } = options;

  return {
    sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    artifact: {
      status: "missing-artifact",
      path: artifactPath,
    },
  };
}

export function staleWorkflowSource(options = {}) {
  const {
    sourcePath = "docs/stale.dp.yaml",
    artifactPath = "docs/stale.svg",
    reasons = ["source-path-mismatch"],
    expectedSourcePath = sourcePath,
    actualSourcePath = "docs/other.dp.yaml",
    expectedSha256 = "expected-hash",
    actualSha256 = expectedSha256,
    expectedRenderer = testRenderer,
    actualRenderer = testRenderer,
  } = options;

  return {
    sourcePath,
    validation: {
      ok: true,
      errors: [],
    },
    artifact: {
      status: "stale",
      path: artifactPath,
      reasons,
      expected: {
        sourcePath: expectedSourcePath,
        sourceSha256: expectedSha256,
        diagramPilotVersion: "0.1.0",
        renderer: expectedRenderer,
      },
      actual: {
        sourcePath: actualSourcePath,
        sourceSha256: actualSha256,
        diagramPilotVersion: "0.1.0",
        renderer: actualRenderer,
      },
    },
  };
}

export function repoWorkflowCheckResult(options = {}) {
  const {
    scope = { kind: "directory", path: "/repo" },
    summary = {
      checkedSourceCount: 0,
      freshSourceCount: 0,
      issueCount: 0,
    },
    sources = [],
  } = options;

  return {
    ok: true,
    scope,
    summary,
    sources,
  };
}

const builtinDiscoveryIgnorePatterns = [
  "node_modules/**",
  ".git/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".next/**",
  ".vite/**",
  ".turbo/**",
];

function discoveryIncludePatterns(target) {
  return target === "code"
    ? [
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
        "**/*.mts",
        "**/*.cts",
      ]
    : ["package.json", "packages/*/package.json"];
}

function baseDiscoverPayload({ target, preset }) {
  return {
    ok: true,
    command: "discover",
    target,
    mode: "summary",
    preset: preset ?? (target === "code" ? "typescript" : "node-package"),
    include: discoveryIncludePatterns(target),
    exclude: builtinDiscoveryIgnorePatterns,
    ignoreSources: [
      {
        source: "builtin",
        patterns: builtinDiscoveryIgnorePatterns,
      },
    ],
    readOnly: true,
  };
}

function codeDiscoverPayload(options) {
  return {
    ...baseDiscoverPayload(options),
    files: options.includeTests ? ["src/app.test.ts", "src/app.ts"] : ["src/app.ts"],
    modules: [],
    importEdges: [],
    unresolvedImports: [],
    ignoredFiles: options.includeTests
      ? []
      : [
          {
            path: "src/app.test.ts",
            classifications: ["test"],
            reason: "test",
          },
        ],
  };
}

function discoverRepoPayload(options) {
  return options.target === "code"
    ? codeDiscoverPayload(options)
    : baseDiscoverPayload(options);
}

export function createPlanningDependencies(overrides = {}) {
  return {
    loadValidatedDiagramSpec: () => validLoadResult(),
    checkDiagramPilotRepoWorkflow: async () => repoWorkflowCheckResult(),
    discoverRepo: discoverRepoPayload,
    generateDiagramPilotRepoWorkflow: async (options) => {
      const loadResult = validLoadResult();
      const content = await options.renderSvgArtifact({
        source: loadResult.source,
        provenanceSourcePath: loadResult.source.path,
        spec: loadResult.spec,
        diagramPilotVersion: "0.1.0",
        renderer: testRenderer,
      });

      return {
        ok: true,
        scope: {
          kind: "file",
          path: loadResult.source.path,
        },
        summary: {
          checkedSourceCount: 1,
          writtenArtifactCount: 1,
          skippedArtifactCount: 0,
          failureCount: 0,
        },
        written: [
          {
            sourcePath: loadResult.source.path,
            format: "svg",
            path: "docs/architecture.svg",
            absolutePath: "docs/architecture.svg",
            content,
          },
        ],
        skipped: [],
        failures: [],
      };
    },
    planDiagramPilotSourceFix: (sourcePath) => ({
      ok: true,
      sourcePath,
      changed: false,
      repairs: [],
      content: [
        "version: 1",
        "title: Checkout Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      validation: {
        ok: true,
        errors: [],
      },
    }),
    exportDiagramSpecToMermaid: () => "flowchart LR\n",
    diffDiagramSpecs,
    lintDiagramSpec: () => ({
      ok: true,
      summary: {
        warningCount: 0,
      },
      warnings: [],
    }),
    inspectDiagramPilotRepoWorkflow: async () => ({
      ok: true,
      scope: { kind: "directory", path: "/repo" },
      summary: {
        discoveredSourceCount: 0,
        validSourceCount: 0,
        invalidSourceCount: 0,
        artifactExpectationCount: 0,
        artifactIssueCount: 0,
      },
      sources: [],
    }),
    exportDiagramSpecToD2: () => "direction: right\n",
    exportDiagramSpecToDot: () => "digraph checkout_architecture {\n}\n",
    readSourceContent: () => "version: 1\n",
    renderDiagramSpecToSvg: async () => "<svg></svg>",
    rasterizeSvgToPng: () => Buffer.from([]),
    createSvgRendererProvenance: () => ({
      sourcePath: "docs/architecture.dp.yaml",
      sourceSha256: "hash",
      diagramPilotVersion: "0.1.0",
      renderer: testRenderer,
    }),
    listPackagedLucideIconNames: () => ["database", "server"],
    getDiagramPilotVersion: () => "0.1.0",
    ...overrides,
  };
}
