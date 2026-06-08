import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  generateDiagramPilotRepoWorkflow,
  generateDiagramPilotRepoWorkflowWithDependencies,
} from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  validSourceContext,
  withTempRepo,
  writeValidDiagramSource,
} from "./repo-workflow-configured-artifacts-helpers.mjs";

function generateOptions(scopePath) {
  return {
    scopePath,
    diagramPilotVersion: "0.1.0",
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
    renderSvgArtifact: async ({ provenanceSourcePath }) =>
      `<svg data-source="${provenanceSourcePath}"></svg>`,
    rasterizeSvgArtifact: () => Buffer.from("png-bytes"),
    exportTextArtifact: ({ format }) => `${format} output\n`,
  };
}

test("generateDiagramPilotRepoWorkflowWithDependencies returns a zero-config SVG write for a source file scope", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const source = validSourceContext(sourcePath);

    await writeValidDiagramSource(sourcePath);

    const result = await generateDiagramPilotRepoWorkflowWithDependencies(
      generateOptions(sourcePath),
      {
        discoverRepoWorkflowConfig: async () => ({ ok: true }),
        discoverDiagramPilotSourceFiles: async () => ({
          ok: true,
          scope: { kind: "file", path: sourcePath },
          sources: [
            {
              absolutePath: sourcePath,
              relativePath: "architecture.dp.yaml",
            },
          ],
        }),
        loadValidatedDiagramSpec: () => ({
          ok: true,
          source,
          spec: source.value,
        }),
        createRepairableDiagnosticReport: () => {
          throw new Error("valid source should not need diagnostics");
        },
        getCurrentWorkingDirectory: () => tempRoot,
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 1,
      writtenArtifactCount: 1,
      skippedArtifactCount: 0,
      failureCount: 0,
    });
    assert.deepEqual(result.written, [
      {
        sourcePath: "docs/architecture.dp.yaml",
        format: "svg",
        path: "docs/architecture.svg",
        absolutePath: path.join(tempRoot, "docs", "architecture.svg"),
        content: '<svg data-source="docs/architecture.dp.yaml"></svg>',
      },
    ]);
    assert.deepEqual(result.skipped, []);
    assert.deepEqual(result.failures, []);
  });
});

test("generateDiagramPilotRepoWorkflow returns configured directory-scope writes including standalone Markdown embeds", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");

    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: svg",
        "        path: generated/svg/{stem}.svg",
        "      - format: mermaid",
        "        path: generated/text/{stem}.mmd",
        "      - format: d2",
        "        path: generated/text/{stem}.d2",
        "      - format: dot",
        "        path: generated/text/{stem}.dot",
        "      - format: png",
        "        path: generated/png/{stem}.png",
        "      - format: markdown",
        "        path: generated/embeds/{stem}.md",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(sourcePath);

    const result = await generateDiagramPilotRepoWorkflow(
      generateOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 1,
      writtenArtifactCount: 6,
      skippedArtifactCount: 0,
      failureCount: 0,
    });
    assert.deepEqual(
      result.written.map(({ sourcePath: source, format, path: outputPath }) => ({
        source,
        format,
        path: outputPath,
      })),
      [
        {
          source: "docs/architecture.dp.yaml",
          format: "svg",
          path: "generated/svg/architecture.svg",
        },
        {
          source: "docs/architecture.dp.yaml",
          format: "mermaid",
          path: "generated/text/architecture.mmd",
        },
        {
          source: "docs/architecture.dp.yaml",
          format: "d2",
          path: "generated/text/architecture.d2",
        },
        {
          source: "docs/architecture.dp.yaml",
          format: "dot",
          path: "generated/text/architecture.dot",
        },
        {
          source: "docs/architecture.dp.yaml",
          format: "png",
          path: "generated/png/architecture.png",
        },
        {
          source: "docs/architecture.dp.yaml",
          format: "markdown",
          path: "generated/embeds/architecture.md",
        },
      ],
    );
    assert.equal(result.skipped.length, 0);
    assert.equal(
      result.written.find((artifact) => artifact.format === "markdown").content,
      [
        "<!-- Generated by DiagramPilot. Do not edit by hand. -->",
        "",
        "# Architecture",
        "",
        "![Architecture](../svg/architecture.svg)",
        "",
        "- [Mermaid artifact](../text/architecture.mmd)",
        "- [D2 artifact](../text/architecture.d2)",
        "- [DOT artifact](../text/architecture.dot)",
        "- [PNG artifact](../png/architecture.png)",
        "",
      ].join("\n"),
    );
  });
});

test("generateDiagramPilotRepoWorkflow refuses configured writes outside the config tree", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: svg",
        "        path: ../outside.svg",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
    );

    const result = await generateDiagramPilotRepoWorkflow(
      generateOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "invalid-config");
    assert.deepEqual(result.written, []);
    assert.match(
      result.failure.message,
      /Artifact output paths must stay within the config directory tree/,
    );
  });
});

test("generateDiagramPilotRepoWorkflow fails invalid sources without planned writes", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeValidDiagramSource(
      path.join(tempRoot, "docs", "valid.dp.yaml"),
    );
    await writeFile(
      path.join(tempRoot, "docs", "invalid.dp.yaml"),
      [
        "version: 1",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await generateDiagramPilotRepoWorkflow(
      generateOptions(tempRoot),
    );

    assert.equal(result.ok, false);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 2,
      writtenArtifactCount: 0,
      skippedArtifactCount: 0,
      failureCount: 1,
    });
    assert.deepEqual(result.written, []);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].sourcePath, "docs/invalid.dp.yaml");
    assert.equal(result.failures[0].errors[0].path, "title");
  });
});
