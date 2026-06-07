import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  checkDiagramPilotRepoWorkflow,
  checkDiagramPilotRepoWorkflowWithDependencies,
} from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  repoWorkflowCheckOptions,
  validSourceContext,
  withTempRepo,
  writeFreshSvgArtifact,
  writeValidDiagramSource,
} from "./repo-workflow-check-helpers.mjs";

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
      "version: 1\nworkflow:\n  check: strict\n",
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.equal(result.failure.path, configPath);
    assert.equal(result.failure.errors[0].path, "workflow");
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
