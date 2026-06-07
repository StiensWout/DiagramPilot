import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { checkDiagramPilotRepoWorkflow } from "../packages/core/dist/index.js";
import {
  repoWorkflowCheckOptions,
  withTempRepo,
} from "./repo-workflow-configured-artifacts-helpers.mjs";

test("checkDiagramPilotRepoWorkflow rejects artifact mappings without exactly one source selector", async () => {
  await withTempRepo(async (tempRoot) => {
    const cases = [
      {
        artifactMapping: [
          "  - source: docs/architecture.dp.yaml",
          "    sourceGlob: docs/**/*.dp.yaml",
          "    outputs:",
          "      - format: svg",
          "        path: docs/architecture.svg",
        ],
        expectedMessage: /exactly one of `source` or `sourceGlob`/,
      },
      {
        artifactMapping: [
          "  - outputs:",
          "      - format: svg",
          "        path: docs/architecture.svg",
        ],
        expectedMessage: /exactly one of `source` or `sourceGlob`/,
      },
    ];

    for (const testCase of cases) {
      const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

      await writeFile(
        configPath,
        ["version: 1", "artifacts:", ...testCase.artifactMapping, ""].join(
          "\n",
        ),
        "utf8",
      );

      const result = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions(tempRoot),
      );

      assert.equal(result.ok, false);
      assert.equal(result.failure.kind, "invalid-config");
      assert.equal(result.failure.path, configPath);
      assert.equal(result.failure.errors[0].path, "artifacts[0]");
      assert.match(result.failure.message, testCase.expectedMessage);
    }
  });
});

test("checkDiagramPilotRepoWorkflow rejects unsupported configured artifact output formats", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: pdf",
        "        path: docs/architecture.pdf",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.equal(result.failure.errors[0].path, "artifacts[0].outputs[0].format");
    assert.match(result.failure.message, /Unsupported artifact output format/);
    assert.match(result.failure.message, /svg, png, mermaid, d2, dot, markdown/);
  });
});

test("checkDiagramPilotRepoWorkflow rejects unsupported configured artifact path template variables", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: svg",
        "        path: docs/{name}.svg",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.equal(result.failure.errors[0].path, "artifacts[0].outputs[0].path");
    assert.match(
      result.failure.message,
      /Unsupported artifact output path template variable/,
    );
    assert.match(result.failure.message, /stem, sourceDir, sourcePath, format/);
  });
});

test("checkDiagramPilotRepoWorkflow rejects configured artifact paths outside the config directory tree", async () => {
  await withTempRepo(async (tempRoot) => {
    const cases = [
      {
        artifactMapping: [
          "  - source: ../architecture.dp.yaml",
          "    outputs:",
          "      - format: svg",
          "        path: docs/architecture.svg",
        ],
        expectedPath: "artifacts[0].source",
      },
      {
        artifactMapping: [
          "  - sourceGlob: /docs/**/*.dp.yaml",
          "    outputs:",
          "      - format: svg",
          "        path: docs/{stem}.svg",
        ],
        expectedPath: "artifacts[0].sourceGlob",
      },
      {
        artifactMapping: [
          "  - source: docs/architecture.dp.yaml",
          "    outputs:",
          "      - format: svg",
          "        path: ../architecture.svg",
        ],
        expectedPath: "artifacts[0].outputs[0].path",
      },
    ];

    for (const testCase of cases) {
      const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

      await writeFile(
        configPath,
        ["version: 1", "artifacts:", ...testCase.artifactMapping, ""].join(
          "\n",
        ),
        "utf8",
      );

      const result = await checkDiagramPilotRepoWorkflow(
        repoWorkflowCheckOptions(tempRoot),
      );

      assert.equal(result.ok, false);
      assert.equal(result.failure.kind, "invalid-config");
      assert.equal(result.failure.errors[0].path, testCase.expectedPath);
      assert.match(result.failure.message, /config directory tree/);
    }
  });
});
