import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  runBuiltCli,
  withTempRepo,
  writeFreshDiagramArtifact,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot generate refreshes the zero-config SVG from the current working directory", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);
    await rm(path.join(tempRoot, "docs", "architecture.svg"));

    const result = await runBuiltCli(["generate", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
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
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(["generate", ".", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.deepEqual(
      payload.written.map(({ format, path: outputPath }) => ({
        format,
        path: outputPath,
      })),
      [
        { format: "mermaid", path: "generated/text/architecture.mmd" },
        { format: "dot", path: "generated/graph/architecture.dot" },
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

    assert.match(mermaid, /^flowchart LR/m);
    assert.match(dot, /^digraph /m);
  });
});
