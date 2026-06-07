import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkDiagramPilotRepoWorkflow,
  checkDiagramPilotRepoWorkflowWithDependencies,
} from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-repo-workflow-check-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function repoWorkflowCheckOptions(scopePath) {
  return {
    scopePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  };
}

function validSourceContext(sourcePath = "/repo/docs/architecture.dp.yaml") {
  return {
    format: "yaml",
    path: sourcePath,
    content: "version: 1\ntitle: Architecture\nnodes:\n  - id: web_app\n    label: Web App\n",
    value: {
      version: 1,
      title: "Architecture",
      nodes: [{ id: "web_app", label: "Web App" }],
    },
  };
}

const validSourceContent = [
  "version: 1",
  "title: Architecture",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "",
].join("\n");

async function writeValidDiagramSource(sourcePath) {
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, validSourceContent, "utf8");
}

async function writeFreshSvgArtifact(artifactPath, provenanceSourcePath) {
  await writeFile(
    artifactPath,
    addSvgProvenanceMetadata(
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
      createSvgRendererProvenance({
        sourcePath: provenanceSourcePath,
        sourceContent: validSourceContent,
      }),
    ),
    "utf8",
  );
}

async function writeSvgArtifactWithContent(artifactPath, svgContent) {
  await writeFile(artifactPath, svgContent, "utf8");
}

function sourcePath(tempRoot, fileName) {
  return path.join(tempRoot, "docs", fileName);
}

function requiredSource(sourcesByPath, sourcePath) {
  const source = sourcesByPath.get(sourcePath);

  assert.notEqual(source, undefined, `Expected result for ${sourcePath}`);

  return source;
}

test("checkDiagramPilotRepoWorkflow returns a successful no-op for directory scopes with no DiagramPilot sources", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.deepEqual(result, {
      ok: true,
      scope: {
        kind: "directory",
        path: tempRoot,
      },
      summary: {
        checkedSourceCount: 0,
        freshSourceCount: 0,
        issueCount: 0,
      },
      sources: [],
    });
  });
});

test("checkDiagramPilotRepoWorkflow discovers config upward and applies source ignores relative to the config directory", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const serviceRoot = path.join(tempRoot, "packages", "checkout-service");
    const sourcePath = path.join(serviceRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(serviceRoot, "docs", "architecture.svg");
    const ignoredSourcePath = path.join(
      serviceRoot,
      "generated",
      "ignored.dp.yaml",
    );

    await writeFile(
      configPath,
      [
        "version: 1",
        "sources:",
        "  ignore:",
        "    - packages/checkout-service/generated/**",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(sourcePath);
    await writeFreshSvgArtifact(artifactPath, "docs/architecture.dp.yaml");
    await mkdir(path.dirname(ignoredSourcePath), { recursive: true });
    await writeFile(
      ignoredSourcePath,
      "version: 1\nnodes:\n  - id: ignored\n    label: Ignored\n",
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(serviceRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.config, { path: configPath });
    assert.deepEqual(result.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });
    assert.deepEqual(
      result.sources.map((source) => source.sourcePath),
      ["docs/architecture.dp.yaml"],
    );
  });
});

test("checkDiagramPilotRepoWorkflow validates config before source processing", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const sourcePath = path.join(tempRoot, "docs", "invalid.dp.yaml");

    await writeFile(configPath, "version: 2\n", "utf8");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(
      sourcePath,
      "version: 1\nnodes:\n  - id: missing_title\n    label: Missing Title\n",
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.equal(result.failure.path, configPath);
    assert.equal(result.failure.errors[0].path, "version");
    assert.match(result.failure.message, /Repo Workflow Configuration error/);
    assert.match(result.failure.message, /version: 1/);
    assert.doesNotMatch(result.failure.message, /Missing required top-level field: title/);
  });
});

test("checkDiagramPilotRepoWorkflow rejects unsafe source ignore patterns", async () => {
  await withTempRepo(async (tempRoot) => {
    const cases = [
      {
        pattern: "/generated/**",
        expectedPath: "sources.ignore[0]",
        expectedMessage: /relative paths/,
      },
      {
        pattern: "../outside/**",
        expectedPath: "sources.ignore[0]",
        expectedMessage: /config directory tree/,
      },
    ];

    for (const testCase of cases) {
      const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

      await writeFile(
        configPath,
        [
          "version: 1",
          "sources:",
          "  ignore:",
          `    - ${testCase.pattern}`,
          "",
        ].join("\n"),
        "utf8",
      );

      const result = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions(tempRoot),
      );

      assert.equal(result.ok, false);
      assert.equal(result.failure.kind, "invalid-config");
      assert.equal(result.failure.errors[0].path, testCase.expectedPath);
      assert.match(result.failure.message, testCase.expectedMessage);
    }
  });
});

test("checkDiagramPilotRepoWorkflow rejects unsupported config fields", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

    await writeFile(
      configPath,
      "version: 1\nartifacts:\n  - source: docs/architecture.dp.yaml\n",
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.equal(result.failure.path, configPath);
    assert.equal(result.failure.errors[0].path, "artifacts");
    assert.match(result.failure.message, /Unsupported Repo Workflow Configuration field/);
  });
});

test("checkDiagramPilotRepoWorkflow uses the nearest config and stops at the Git root", async () => {
  await withTempRepo(async (tempRoot) => {
    const nearestConfigRoot = path.join(tempRoot, "packages", "service");
    const nearestSourcePath = path.join(
      nearestConfigRoot,
      "docs",
      "architecture.dp.yaml",
    );
    const nearestArtifactPath = path.join(
      nearestConfigRoot,
      "docs",
      "architecture.svg",
    );

    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      "version: 1\nsources:\n  ignore:\n    - packages/**\n",
      "utf8",
    );
    await mkdir(nearestConfigRoot, { recursive: true });
    await writeFile(
      path.join(nearestConfigRoot, "diagrampilot.config.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeValidDiagramSource(nearestSourcePath);
    await writeFreshSvgArtifact(
      nearestArtifactPath,
      "docs/architecture.dp.yaml",
    );

    const nearestResult = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(nearestConfigRoot),
    );

    assert.equal(nearestResult.ok, true);
    assert.deepEqual(nearestResult.config, {
      path: path.join(nearestConfigRoot, "diagrampilot.config.yaml"),
    });
    assert.deepEqual(nearestResult.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });

    const repoRoot = path.join(tempRoot, "repo");
    const repoSourcePath = path.join(repoRoot, "docs", "architecture.dp.yaml");
    const repoArtifactPath = path.join(repoRoot, "docs", "architecture.svg");

    await mkdir(path.join(repoRoot, ".git"), { recursive: true });
    await writeValidDiagramSource(repoSourcePath);
    await writeFreshSvgArtifact(repoArtifactPath, "docs/architecture.dp.yaml");

    const gitBoundaryResult = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(repoRoot),
    );

    assert.equal(gitBoundaryResult.ok, true);
    assert.equal(gitBoundaryResult.config, undefined);
    assert.deepEqual(gitBoundaryResult.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });
  });
});

test("checkDiagramPilotRepoWorkflowWithDependencies passes validated source context into artifact freshness once", async () => {
  const source = validSourceContext();
  let loadCount = 0;
  let freshnessOptions;

  const result = await checkDiagramPilotRepoWorkflowWithDependencies(
    {
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    },
    {
      discoverDiagramPilotSourceFiles: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        sources: [
          {
            absolutePath: "/repo/docs/architecture.dp.yaml",
            relativePath: "docs/architecture.dp.yaml",
          },
        ],
      }),
      loadValidatedDiagramSpec: () => {
        loadCount += 1;

        return {
          ok: true,
          source,
          spec: source.value,
        };
      },
      checkExpectedSvgArtifactFreshnessForValidatedSource: async (options) => {
        freshnessOptions = options;

        return {
          sourcePath: source.path,
          artifactPath: "/repo/docs/architecture.svg",
          status: "fresh",
          provenance: {
            sourcePath: "docs/architecture.dp.yaml",
            sourceSha256: "hash",
            diagramPilotVersion: "0.1.0",
            renderer: {
              name: SVG_RENDERER_NAME,
              version: SVG_RENDERER_VERSION,
            },
          },
        };
      },
      createRepairableDiagnosticReport: () => {
        throw new Error("valid sources should not need diagnostics");
      },
      getCurrentWorkingDirectory: () => "/repo",
    },
  );

  assert.equal(loadCount, 1);
  assert.equal(freshnessOptions.source, source);
  assert.equal(
    freshnessOptions.provenanceSourcePath,
    "docs/architecture.dp.yaml",
  );
  assert.equal(freshnessOptions.renderer.name, SVG_RENDERER_NAME);
  assert.deepEqual(result, {
    ok: true,
    scope: { kind: "directory", path: "/repo" },
    summary: {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    },
    sources: [
      {
        sourcePath: "docs/architecture.dp.yaml",
        validation: {
          ok: true,
          errors: [],
        },
        artifact: {
          status: "fresh",
          path: "docs/architecture.svg",
          provenance: {
            sourcePath: "docs/architecture.dp.yaml",
            sourceSha256: "hash",
            diagramPilotVersion: "0.1.0",
            renderer: {
              name: SVG_RENDERER_NAME,
              version: SVG_RENDERER_VERSION,
            },
          },
        },
      },
    ],
  });
});

test("checkDiagramPilotRepoWorkflow returns command-style discovery failures for missing and unsupported check scopes", async () => {
  await withTempRepo(async (tempRoot) => {
    const missingPath = path.join(tempRoot, "missing");
    const unsupportedPath = path.join(tempRoot, "docs", "architecture.yml");

    await mkdir(path.dirname(unsupportedPath), { recursive: true });
    await writeFile(unsupportedPath, "version: 1\n", "utf8");

    const missingResult = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(missingPath),
    );
    const unsupportedResult = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(unsupportedPath),
    );

    assert.deepEqual(missingResult, {
      ok: false,
      failure: {
        kind: "path-not-found",
        path: missingPath,
        message: `Path does not exist: ${missingPath}`,
      },
    });
    assert.deepEqual(unsupportedResult, {
      ok: false,
      failure: {
        kind: "unsupported-source-path",
        path: unsupportedPath,
        message: `Unsupported DiagramPilot source file: ${unsupportedPath}`,
      },
    });
  });
});

test("checkDiagramPilotRepoWorkflow evaluates current directory, explicit directory, and explicit source file scopes", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");

    await writeValidDiagramSource(sourcePath);
    await writeFreshSvgArtifact(artifactPath, "docs/architecture.dp.yaml");

    const originalCwd = process.cwd();
    process.chdir(tempRoot);

    try {
      const currentDirectoryResult = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions(undefined),
      );
      const explicitDirectoryResult = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions(tempRoot),
      );
      const explicitSourceResult = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions("docs/architecture.dp.yaml"),
      );

      assert.equal(currentDirectoryResult.ok, true);
      assert.equal(currentDirectoryResult.scope.kind, "directory");
      assert.equal(currentDirectoryResult.scope.path, tempRoot);
      assert.deepEqual(currentDirectoryResult.summary, {
        checkedSourceCount: 1,
        freshSourceCount: 1,
        issueCount: 0,
      });
      assert.equal(
        currentDirectoryResult.sources[0].sourcePath,
        "docs/architecture.dp.yaml",
      );
      assert.equal(
        currentDirectoryResult.sources[0].artifact.path,
        "docs/architecture.svg",
      );

      assert.equal(explicitDirectoryResult.ok, true);
      assert.equal(explicitDirectoryResult.scope.kind, "directory");
      assert.equal(explicitDirectoryResult.scope.path, tempRoot);
      assert.deepEqual(explicitDirectoryResult.summary, {
        checkedSourceCount: 1,
        freshSourceCount: 1,
        issueCount: 0,
      });

      assert.equal(explicitSourceResult.ok, true);
      assert.deepEqual(explicitSourceResult.scope, {
        kind: "file",
        path: "docs/architecture.dp.yaml",
      });
      assert.deepEqual(explicitSourceResult.summary, {
        checkedSourceCount: 1,
        freshSourceCount: 1,
        issueCount: 0,
      });
      assert.equal(
        explicitSourceResult.sources[0].sourcePath,
        "docs/architecture.dp.yaml",
      );
      assert.equal(explicitSourceResult.sources[0].artifact.status, "fresh");
      assert.equal(
        explicitSourceResult.sources[0].artifact.provenance.sourcePath,
        "docs/architecture.dp.yaml",
      );
    } finally {
      process.chdir(originalCwd);
    }
  });
});

test("checkDiagramPilotRepoWorkflow returns aggregate per-source results for every SVG artifact state", async () => {
  await withTempRepo(async (tempRoot) => {
    const files = {
      fresh: "01-fresh.dp.yaml",
      invalid: "02-invalid.dp.yaml",
      missingArtifact: "03-missing-artifact.dp.yaml",
      malformedArtifact: "04-malformed-artifact.dp.yaml",
      missingProvenance: "05-missing-provenance.dp.yaml",
      unreadableArtifact: "06-unreadable-artifact.dp.yaml",
      staleArtifact: "07-stale-artifact.dp.yaml",
    };

    for (const fileName of [
      files.fresh,
      files.missingArtifact,
      files.malformedArtifact,
      files.missingProvenance,
      files.unreadableArtifact,
      files.staleArtifact,
    ]) {
      await writeValidDiagramSource(sourcePath(tempRoot, fileName));
    }

    await writeFile(
      sourcePath(tempRoot, files.invalid),
      [
        "version: 1",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    await writeFreshSvgArtifact(
      sourcePath(tempRoot, "01-fresh.svg"),
      "docs/01-fresh.dp.yaml",
    );
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "04-malformed-artifact.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="diagrampilot-provenance">{not json}</metadata><g /></svg>',
    );
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "05-missing-provenance.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
    );
    await mkdir(sourcePath(tempRoot, "06-unreadable-artifact.svg"), {
      recursive: true,
    });
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "07-stale-artifact.svg"),
      addSvgProvenanceMetadata(
        '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
        {
          sourcePath: "docs/other.dp.yaml",
          sourceSha256: "old-hash",
          diagramPilotVersion: "9.9.9",
          renderer: {
            name: "other-renderer",
            version: "0.0.1",
          },
        },
      ),
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 7,
      freshSourceCount: 1,
      issueCount: 6,
    });

    const sourcesByPath = new Map(
      result.sources.map((source) => [source.sourcePath, source]),
    );
    const fresh = requiredSource(sourcesByPath, "docs/01-fresh.dp.yaml");
    const invalid = requiredSource(sourcesByPath, "docs/02-invalid.dp.yaml");
    const missingArtifact = requiredSource(
      sourcesByPath,
      "docs/03-missing-artifact.dp.yaml",
    );
    const malformedArtifact = requiredSource(
      sourcesByPath,
      "docs/04-malformed-artifact.dp.yaml",
    );
    const missingProvenance = requiredSource(
      sourcesByPath,
      "docs/05-missing-provenance.dp.yaml",
    );
    const unreadableArtifact = requiredSource(
      sourcesByPath,
      "docs/06-unreadable-artifact.dp.yaml",
    );
    const staleArtifact = requiredSource(
      sourcesByPath,
      "docs/07-stale-artifact.dp.yaml",
    );

    assert.equal(fresh.validation.ok, true);
    assert.equal(fresh.artifact.status, "fresh");
    assert.equal(fresh.artifact.path, "docs/01-fresh.svg");
    assert.equal(
      fresh.artifact.provenance.sourcePath,
      "docs/01-fresh.dp.yaml",
    );

    assert.equal(invalid.validation.ok, false);
    assert.equal(invalid.validation.errors[0].path, "title");
    assert.equal(invalid.artifact.status, "unchecked");

    assert.deepEqual(missingArtifact.artifact, {
      status: "missing-artifact",
      path: "docs/03-missing-artifact.svg",
    });

    assert.equal(malformedArtifact.artifact.status, "malformed-artifact");
    assert.equal(
      malformedArtifact.artifact.path,
      "docs/04-malformed-artifact.svg",
    );
    assert.match(malformedArtifact.artifact.message, /json|unexpected token/i);

    assert.deepEqual(missingProvenance.artifact, {
      status: "missing-provenance",
      path: "docs/05-missing-provenance.svg",
    });

    assert.equal(unreadableArtifact.artifact.status, "unreadable-artifact");
    assert.equal(
      unreadableArtifact.artifact.path,
      "docs/06-unreadable-artifact.svg",
    );
    assert.match(unreadableArtifact.artifact.message, /EISDIR|directory/i);

    assert.equal(staleArtifact.artifact.status, "stale");
    assert.equal(staleArtifact.artifact.path, "docs/07-stale-artifact.svg");
    assert.deepEqual(staleArtifact.artifact.reasons, [
      "source-path-mismatch",
      "source-sha256-mismatch",
      "diagram-pilot-version-mismatch",
      "renderer-name-mismatch",
      "renderer-version-mismatch",
    ]);
    assert.equal(
      staleArtifact.artifact.expected.sourcePath,
      "docs/07-stale-artifact.dp.yaml",
    );
    assert.equal(
      staleArtifact.artifact.actual.sourcePath,
      "docs/other.dp.yaml",
    );
  });
});
