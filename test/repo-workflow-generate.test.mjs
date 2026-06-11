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

function profileConfig(tempRoot, outputs) {
  return {
    ok: true,
    config: {
      path: path.join(tempRoot, "diagrampilot.config.yaml"),
      directory: tempRoot,
      version: 1,
      sources: { ignore: [] },
      artifacts: [
        {
          source: "docs/architecture.dp.yaml",
          outputs,
        },
      ],
    },
  };
}

function validGenerateDependencies(options) {
  const {
    tempRoot,
    sourcePath,
    source,
    configResult = { ok: true },
    scope = { kind: "directory", path: tempRoot },
    relativePath = "docs/architecture.dp.yaml",
  } = options;

  return {
    discoverRepoWorkflowConfig: async () => configResult,
    discoverDiagramPilotSourceFiles: async () => ({
      ok: true,
      scope,
      sources: [
        {
          absolutePath: sourcePath,
          relativePath,
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
  };
}

test("generateDiagramPilotRepoWorkflowWithDependencies returns a zero-config SVG write for a source file scope", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const source = validSourceContext(sourcePath);

    await writeValidDiagramSource(sourcePath);

    const result = await generateDiagramPilotRepoWorkflowWithDependencies(
      generateOptions(sourcePath),
      validGenerateDependencies({
        tempRoot,
        sourcePath,
        source,
        scope: { kind: "file", path: sourcePath },
        relativePath: "architecture.dp.yaml",
      }),
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

test("generateDiagramPilotRepoWorkflowWithDependencies passes configured output profiles to text artifact generation", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const source = validSourceContext(sourcePath);
    const receivedProfiles = [];

    const result = await generateDiagramPilotRepoWorkflowWithDependencies(
      {
        ...generateOptions(tempRoot),
        exportTextArtifact: ({ profile }) => {
          receivedProfiles.push(profile);
          return `${profile} output\n`;
        },
      },
      {
        ...validGenerateDependencies({
          tempRoot,
          sourcePath,
          source,
          configResult: profileConfig(tempRoot, [
            {
              format: "mermaid",
              path: "generated/{stem}.mmd",
              profile: "compact",
            },
          ]),
        }),
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(receivedProfiles, ["compact"]);
    assert.equal(result.written[0].content, "compact output\n");
  });
});

test("generateDiagramPilotRepoWorkflowWithDependencies passes configured output profiles to SVG generation", async () => {
  await withTempRepo(async (tempRoot) => {
    const receivedProfiles = [];
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const source = validSourceContext(sourcePath);
    const profiledGenerateOptions = {
      ...generateOptions(tempRoot),
      renderSvgArtifact: async ({ profile }) => {
        receivedProfiles.push(profile);
        return `<svg data-profile="${profile}"></svg>`;
      },
    };

    const result = await generateDiagramPilotRepoWorkflowWithDependencies(
      profiledGenerateOptions,
      {
        ...validGenerateDependencies({
          tempRoot,
          sourcePath,
          source,
          configResult: profileConfig(tempRoot, [
            {
              format: "svg",
              path: "generated/{stem}.svg",
              profile: "presentation",
            },
          ]),
        }),
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(receivedProfiles, ["presentation"]);
    assert.equal(
      result.written[0].content,
      '<svg data-profile="presentation"></svg>',
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
