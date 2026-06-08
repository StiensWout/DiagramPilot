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
  assertSingleFreshSource,
  assertSingleIssueSource,
  generatedArchitectureEmbed,
  repoWorkflowCheckOptions,
  requiredSource,
  sha256,
  staleArchitectureEmbed,
  validSourceContent,
  validSourceContext,
  withTempRepo,
  writeMarkdownEmbedArtifact,
  writeMarkdownEmbedConfig,
  writeFreshSvgArtifact,
  writeSvgAndMarkdownEmbed,
  writeValidDiagramSource,
} from "./repo-workflow-configured-artifacts-helpers.mjs";

test("checkDiagramPilotRepoWorkflow replaces the default SVG expectation with matched configured artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const pngPath = path.join(tempRoot, "artifacts", "architecture.png");

    await writeFile(
      configPath,
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: png",
        "        path: artifacts/{stem}.{format}",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(sourcePath);
    await mkdir(path.dirname(pngPath), { recursive: true });
    await writeFile(pngPath, "png-bytes", "utf8");

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assertSingleFreshSource(result);
    assert.deepEqual(result.sources[0].artifacts, [
      {
        format: "png",
        status: "fresh",
        path: "artifacts/architecture.png",
        freshness: "presence-only",
      },
    ]);
  });
});

test("checkDiagramPilotRepoWorkflow applies source glob mappings while unmatched sources keep default SVG expectations", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const firstSourcePath = path.join(
      tempRoot,
      "docs",
      "configured",
      "checkout.dp.yaml",
    );
    const secondSourcePath = path.join(
      tempRoot,
      "docs",
      "configured",
      "payments.dp.yaml",
    );
    const unmatchedSourcePath = path.join(tempRoot, "docs", "unmatched.dp.yaml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "artifacts:",
        "  - sourceGlob: docs/configured/*.dp.yaml",
        "    outputs:",
        "      - format: png",
        "        path: artifacts/{sourceDir}/{stem}.{format}",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(firstSourcePath);
    await writeValidDiagramSource(secondSourcePath);
    await writeValidDiagramSource(unmatchedSourcePath);
    await mkdir(path.join(tempRoot, "artifacts", "docs", "configured"), {
      recursive: true,
    });
    await writeFile(
      path.join(tempRoot, "artifacts", "docs", "configured", "checkout.png"),
      "png-bytes",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "artifacts", "docs", "configured", "payments.png"),
      "png-bytes",
      "utf8",
    );
    await writeFreshSvgArtifact(
      path.join(tempRoot, "docs", "unmatched.svg"),
      "docs/unmatched.dp.yaml",
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 3,
      freshSourceCount: 3,
      issueCount: 0,
    });

    const sourcesByPath = new Map(
      result.sources.map((source) => [source.sourcePath, source]),
    );
    assert.deepEqual(
      requiredSource(
        sourcesByPath,
        "docs/configured/checkout.dp.yaml",
      ).artifacts,
      [
        {
          format: "png",
          status: "fresh",
          path: "artifacts/docs/configured/checkout.png",
          freshness: "presence-only",
        },
      ],
    );
    assert.deepEqual(
      requiredSource(
        sourcesByPath,
        "docs/configured/payments.dp.yaml",
      ).artifacts,
      [
        {
          format: "png",
          status: "fresh",
          path: "artifacts/docs/configured/payments.png",
          freshness: "presence-only",
        },
      ],
    );
    assert.equal(
      requiredSource(sourcesByPath, "docs/unmatched.dp.yaml").artifact.status,
      "fresh",
    );
    assert.equal(
      requiredSource(sourcesByPath, "docs/unmatched.dp.yaml").artifact.path,
      "docs/unmatched.svg",
    );
  });
});

test("checkDiagramPilotRepoWorkflow does not let source ignores suppress explicitly configured artifact failures", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const sourcePath = path.join(tempRoot, "docs", "ignored.dp.yaml");

    await writeFile(
      configPath,
      [
        "version: 1",
        "sources:",
        "  ignore:",
        "    - docs/**",
        "artifacts:",
        "  - source: docs/ignored.dp.yaml",
        "    outputs:",
        "      - format: png",
        "        path: artifacts/{stem}.png",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(sourcePath);

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 0,
      issueCount: 1,
    });
    assert.equal(result.sources[0].sourcePath, "docs/ignored.dp.yaml");
    assert.deepEqual(result.sources[0].artifacts, [
      {
        format: "png",
        status: "missing-artifact",
        path: "artifacts/ignored.png",
      },
    ]);
  });
});

test("checkDiagramPilotRepoWorkflowWithDependencies uses content comparison for configured Mermaid, D2, and DOT artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const source = validSourceContext(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
    );
    const expectedText = {
      mermaid: "flowchart LR\n  web_app[\"Web App\"]\n",
      d2: "web_app: Web App\n",
      dot: "digraph Architecture {\n  web_app;\n}\n",
    };
    const staleD2Content = "web_app: Old Web App\n";

    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "architecture.mmd"),
      expectedText.mermaid,
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "architecture.d2"),
      staleD2Content,
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "architecture.dot"),
      expectedText.dot,
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflowWithDependencies(
      {
        renderer: {
          name: SVG_RENDERER_NAME,
          version: SVG_RENDERER_VERSION,
        },
      },
      {
        discoverRepoWorkflowConfig: async () => ({
          ok: true,
          config: {
            path: path.join(tempRoot, "diagrampilot.config.yaml"),
            directory: tempRoot,
            version: 1,
            sources: { ignore: [] },
            artifacts: [
              {
                source: "docs/architecture.dp.yaml",
                outputs: [
                  { format: "mermaid", path: "docs/{stem}.mmd" },
                  { format: "d2", path: "docs/{stem}.d2" },
                  { format: "dot", path: "docs/{stem}.dot" },
                ],
              },
            ],
          },
        }),
        discoverDiagramPilotSourceFiles: async () => ({
          ok: true,
          scope: { kind: "directory", path: tempRoot },
          sources: [
            {
              absolutePath: source.path,
              relativePath: "docs/architecture.dp.yaml",
            },
          ],
        }),
        loadValidatedDiagramSpec: () => ({
          ok: true,
          source,
          spec: source.value,
        }),
        checkExpectedSvgArtifactFreshnessForValidatedSource: async () => {
          throw new Error("configured outputs replace default SVG freshness");
        },
        exportConfiguredTextArtifact: ({ format }) => expectedText[format],
        createRepairableDiagnosticReport: () => {
          throw new Error("valid sources should not need diagnostics");
        },
        getCurrentWorkingDirectory: () => tempRoot,
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 0,
      issueCount: 1,
    });
    assert.deepEqual(result.sources[0].artifacts, [
      {
        format: "mermaid",
        status: "fresh",
        path: "docs/architecture.mmd",
        freshness: "content",
      },
      {
        format: "d2",
        status: "stale",
        path: "docs/architecture.d2",
        reasons: ["content-mismatch"],
        expectedSha256: sha256(expectedText.d2),
        actualSha256: sha256(staleD2Content),
      },
      {
        format: "dot",
        status: "fresh",
        path: "docs/architecture.dot",
        freshness: "content",
      },
    ]);
  });
});

test("checkDiagramPilotRepoWorkflow uses provenance freshness for configured SVG artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(tempRoot, "artifacts", "architecture.svg");

    await writeFile(
      configPath,
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: svg",
        "        path: artifacts/{stem}.svg",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeValidDiagramSource(sourcePath);
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFreshSvgArtifact(artifactPath, "docs/architecture.dp.yaml");

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assertSingleFreshSource(result);
    assert.equal(result.sources[0].artifacts[0].format, "svg");
    assert.equal(result.sources[0].artifacts[0].status, "fresh");
    assert.equal(result.sources[0].artifacts[0].path, "artifacts/architecture.svg");
    assert.equal(
      result.sources[0].artifacts[0].provenance.sourcePath,
      "docs/architecture.dp.yaml",
    );
    assert.equal(result.sources[0].artifacts[0].freshness, undefined);
  });
});

test("checkDiagramPilotRepoWorkflow reports stale Markdown embeds by content", async () => {
  await withTempRepo(async (tempRoot) => {
    const { embedPath, svgPath } = await writeMarkdownEmbedConfig(tempRoot);

    await writeSvgAndMarkdownEmbed({
      svgPath,
      embedPath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      embedContent: staleArchitectureEmbed,
    });

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assertSingleIssueSource(result);
    assert.equal(result.sources[0].artifacts[0].status, "fresh");
    assert.deepEqual(result.sources[0].artifacts[1], {
      format: "markdown",
      status: "stale",
      path: "generated/embeds/architecture.md",
      reasons: ["content-mismatch"],
      expectedSha256: sha256(generatedArchitectureEmbed),
      actualSha256: sha256(staleArchitectureEmbed),
    });
  });
});

test("checkDiagramPilotRepoWorkflow reports Markdown embeds stale when referenced artifacts are missing", async () => {
  await withTempRepo(async (tempRoot) => {
    const { embedPath } = await writeMarkdownEmbedConfig(tempRoot);

    await writeMarkdownEmbedArtifact(embedPath, generatedArchitectureEmbed);

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assertSingleIssueSource(result);
    assert.deepEqual(result.sources[0].artifacts, [
      {
        format: "svg",
        status: "missing-artifact",
        path: "generated/svg/architecture.svg",
      },
      {
        format: "markdown",
        status: "stale",
        path: "generated/embeds/architecture.md",
        reasons: ["referenced-artifact-missing"],
        references: [
          {
            format: "svg",
            path: "generated/svg/architecture.svg",
            status: "missing-artifact",
          },
        ],
      },
    ]);
  });
});

test("checkDiagramPilotRepoWorkflow reports Markdown embeds stale when referenced artifacts are stale", async () => {
  await withTempRepo(async (tempRoot) => {
    const { embedPath, svgPath } = await writeMarkdownEmbedConfig(tempRoot);

    await writeSvgAndMarkdownEmbed({
      svgPath,
      embedPath,
      provenanceSourcePath: "docs/old-architecture.dp.yaml",
      embedContent: generatedArchitectureEmbed,
    });

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assertSingleIssueSource(result);
    assert.equal(result.sources[0].artifacts[0].format, "svg");
    assert.equal(result.sources[0].artifacts[0].status, "stale");
    assert.deepEqual(result.sources[0].artifacts[1], {
      format: "markdown",
      status: "stale",
      path: "generated/embeds/architecture.md",
      reasons: ["referenced-artifact-stale"],
      references: [
        {
          format: "svg",
          path: "generated/svg/architecture.svg",
          status: "stale",
        },
      ],
    });
  });
});
