import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadValidatedDiagramSpec } from "../packages/core/dist/index.js";
import { assertYamlSourceRepairHint } from "./source-format-assertions.mjs";

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-validated-loading-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test("loadValidatedDiagramSpec returns a valid DiagramSpec with source context from YAML", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");

    const sourceContent = [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n");

    await writeFile(sourcePath, sourceContent, "utf8");

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, true);
    assert.equal(result.source.path, sourcePath);
    assert.equal(result.source.format, "yaml");
    assert.equal(result.source.content, sourceContent);
    assert.equal(result.spec.title, "Checkout Architecture");
    assert.deepEqual(result.spec.nodes, [{ id: "web_app", label: "Web App" }]);
  });
});

test("loadValidatedDiagramSpec rejects an explicit JSON source path with a YAML repair hint", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.json");

    const sourceContent = JSON.stringify(
      {
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
      null,
      2,
    );

    await writeFile(sourcePath, sourceContent, "utf8");

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "unsupported-source-format");
    assert.equal(result.failure.path, sourcePath);
    assertYamlSourceRepairHint(result.failure.message);
  });
});

test("loadValidatedDiagramSpec returns a read failure for an explicit unreadable source path", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "missing.dp.yaml");

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "read");
    assert.equal(result.failure.path, sourcePath);
    assert.equal(typeof result.failure.message, "string");
    assert.notEqual(result.failure.message.length, 0);
  });
});

test("loadValidatedDiagramSpec returns a YAML parse failure before semantic validation", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "broken.dp.yaml");

    await writeFile(
      sourcePath,
      [
        "version: 1",
        "title: Broken Source",
        "nodes: [",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "parse");
    assert.equal(result.failure.format, "yaml");
    assert.equal(result.failure.path, sourcePath);
    assert.equal(typeof result.failure.message, "string");
    assert.notEqual(result.failure.message.length, 0);
  });
});

test("loadValidatedDiagramSpec rejects a JSON source path before parsing JSON syntax", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "broken.dp.json");

    await writeFile(
      sourcePath,
      [
        "{",
        '  "version": 1,',
        '  "title": "Broken Source",',
        '  "nodes": [',
        '    { "id": "web_app", "label": "Web App" },',
        "  ]",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "unsupported-source-format");
    assert.equal(result.failure.path, sourcePath);
    assertYamlSourceRepairHint(result.failure.message);
  });
});

test("loadValidatedDiagramSpec returns semantic validation failures with source context", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "missing-title.dp.yaml");

    await writeFile(
      sourcePath,
      [
        "version: 1",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "validation");
    assert.equal(result.failure.source.path, sourcePath);
    assert.equal(result.failure.source.format, "yaml");
    assert.deepEqual(result.failure.errors, [
      {
        path: "title",
        message: "Missing required top-level field: title.",
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: "Add title to the top level of the DiagramSpec.",
      },
    ]);
  });
});
