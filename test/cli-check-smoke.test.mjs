import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  runBuiltCli,
  withTempRepo,
  writeFreshDiagramArtifact,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot check uses the current working directory by default", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(["check"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    );
  });
});

test("diagrampilot check supports an explicit directory scope with aggregate json output", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(["check", ".", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.deepEqual(payload.scope, {
      kind: "directory",
      path: ".",
    });
    assert.deepEqual(payload.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });
    assert.equal(payload.sources.length, 1);
    assert.equal(payload.sources[0].sourcePath, "docs/architecture.dp.yaml");
    assert.equal(payload.sources[0].artifact.status, "fresh");
    assert.equal(payload.sources[0].artifact.path, "docs/architecture.svg");
  });
});

test("diagrampilot check --json includes the config path when config is used", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);
    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      "version: 1\n",
      "utf8",
    );

    const result = await runBuiltCli(["check", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.deepEqual(payload.config, {
      path: "diagrampilot.config.yaml",
    });
    assert.equal(payload.sources[0].sourcePath, "docs/architecture.dp.yaml");
  });
});

test("diagrampilot check --json reports configured artifact results", async () => {
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
        "        path: docs/architecture.mmd",
        "      - format: png",
        "        path: docs/architecture.png",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "architecture.mmd"),
      "flowchart LR\n  web_app[\"Web App\"]\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "architecture.png"),
      "png-bytes",
      "utf8",
    );

    const result = await runBuiltCli(["check", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.deepEqual(payload.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });
    assert.deepEqual(payload.sources[0].artifacts, [
      {
        format: "mermaid",
        status: "fresh",
        path: "docs/architecture.mmd",
        freshness: "content",
      },
      {
        format: "png",
        status: "fresh",
        path: "docs/architecture.png",
        freshness: "presence-only",
      },
    ]);
  });
});

test("diagrampilot check supports one explicit source file", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(
      ["check", "docs/architecture.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    );
  });
});
