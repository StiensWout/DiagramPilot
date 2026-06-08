import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  parseSuccessfulJsonCliPayload,
  runBuiltCli,
  withTempRepo,
  writeFreshDiagramArtifact,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot generate refreshes the zero-config SVG from the current working directory", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);
    await rm(path.join(tempRoot, "docs", "architecture.svg"));

    const result = await runBuiltCli(["generate", "--json"], tempRoot);
    const payload = parseSuccessfulJsonCliPayload(result);
    assert.deepEqual(payload.summary, {
      checkedSourceCount: 1,
      writtenArtifactCount: 1,
      skippedArtifactCount: 0,
      failureCount: 0,
    });
    assert.deepEqual(payload.written, [
      {
        sourcePath: "docs/architecture.dp.yaml",
        format: "svg",
        path: "docs/architecture.svg",
      },
    ]);

    const svg = await readFile(
      path.join(tempRoot, "docs", "architecture.svg"),
      "utf8",
    );

    assert.match(svg, /<svg\b/);
    assert.match(svg, /diagrampilot-provenance/);
  });
});

test("diagrampilot generate creates parent directories for configured directory outputs", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);
    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: mermaid",
        "        path: generated/text/{stem}.mmd",
        "      - format: dot",
        "        path: generated/graph/{stem}.dot",
        "      - format: markdown",
        "        path: generated/embeds/{stem}.md",
        "",
      ].join("\n"),
      "utf8",
    );
    const guidePath = path.join(tempRoot, "docs", "guide.md");
    const guideContent = [
      "# Architecture Notes",
      "",
      "This prose document is project-owned and should not be edited by generate.",
      "",
    ].join("\n");

    await writeFile(guidePath, guideContent, "utf8");

    const result = await runBuiltCli(["generate", ".", "--json"], tempRoot);
    const payload = parseSuccessfulJsonCliPayload(result);
    assert.deepEqual(
      payload.written.map(({ format, path: outputPath }) => ({
        format,
        path: outputPath,
      })),
      [
        { format: "mermaid", path: "generated/text/architecture.mmd" },
        { format: "dot", path: "generated/graph/architecture.dot" },
        { format: "markdown", path: "generated/embeds/architecture.md" },
      ],
    );

    const mermaid = await readFile(
      path.join(tempRoot, "generated", "text", "architecture.mmd"),
      "utf8",
    );
    const dot = await readFile(
      path.join(tempRoot, "generated", "graph", "architecture.dot"),
      "utf8",
    );
    const embed = await readFile(
      path.join(tempRoot, "generated", "embeds", "architecture.md"),
      "utf8",
    );
    const guide = await readFile(guidePath, "utf8");

    assert.match(mermaid, /^flowchart LR/m);
    assert.match(dot, /^digraph /m);
    assert.match(embed, /# Checkout Architecture/);
    assert.match(embed, /\[Mermaid artifact\]\(\.\.\/text\/architecture\.mmd\)/);
    assert.match(embed, /\[DOT artifact\]\(\.\.\/graph\/architecture\.dot\)/);
    assert.equal(guide, guideContent);
  });
});
