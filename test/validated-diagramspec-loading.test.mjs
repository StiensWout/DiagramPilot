import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { loadValidatedDiagramSpec } from "../packages/core/dist/index.js";
import {
  assertFailedLoad,
  brokenYamlSourceLines,
  writeDiagramSource,
} from "./diagramspec-loading-helpers.mjs";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";

async function withTempRepo(run) {
  return withTempRepoPrefix("diagrampilot-validated-loading-", run);
}

async function assertNonYamlSourceRejected(tempRoot, fileName, lines) {
  const sourcePath = await writeDiagramSource(tempRoot, fileName, lines);
  const result = loadValidatedDiagramSpec(sourcePath);

  assertFailedLoad(result, "unsupported-source-format");
  assert.equal(result.failure.path, sourcePath);
  assert.equal(
    result.failure.message,
    `Unsupported DiagramPilot source file: ${sourcePath}`,
  );
}

function assertFailureMessage(failure) {
  assert.equal(typeof failure.message, "string");
  assert.notEqual(failure.message.length, 0);
}

test("loadValidatedDiagramSpec returns a valid DiagramSpec with source context from YAML", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourceLines = [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
    ];
    const sourceContent = sourceLines.join("\n");
    const sourcePath = await writeDiagramSource(
      tempRoot,
      "architecture.dp.yaml",
      sourceLines,
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assert.equal(result.ok, true);
    assert.equal(result.source.path, sourcePath);
    assert.equal(result.source.format, "yaml");
    assert.equal(result.source.content, sourceContent);
    assert.equal(result.spec.title, "Checkout Architecture");
    assert.deepEqual(result.spec.nodes, [{ id: "web_app", label: "Web App" }]);
  });
});

test("loadValidatedDiagramSpec rejects explicit non-YAML source paths generically", async () => {
  await withTempRepo(async (tempRoot) => {
    await assertNonYamlSourceRejected(tempRoot, "architecture.dp.json", [
      "{",
      '  "version": 1,',
      '  "title": "Checkout Architecture",',
      '  "nodes": [{ "id": "web_app", "label": "Web App" }]',
      "}",
    ]);
  });
});

test("loadValidatedDiagramSpec returns a read failure for an explicit unreadable source path", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "missing.dp.yaml");

    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "read");
    assert.equal(result.failure.path, sourcePath);
    assertFailureMessage(result.failure);
  });
});

test("loadValidatedDiagramSpec returns a YAML parse failure before semantic validation", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(
      tempRoot,
      "broken.dp.yaml",
      brokenYamlSourceLines,
    );

    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "parse");
    assert.equal(result.failure.format, "yaml");
    assert.equal(result.failure.path, sourcePath);
    assertFailureMessage(result.failure);
  });
});

test("loadValidatedDiagramSpec rejects non-YAML source paths before parsing content", async () => {
  await withTempRepo(async (tempRoot) => {
    await assertNonYamlSourceRejected(tempRoot, "broken.dp.json", [
      "{",
      '  "version": 1,',
      '  "title": "Broken Source",',
      '  "nodes": [',
    ]);
  });
});

test("loadValidatedDiagramSpec returns semantic validation failures with source context", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "missing-title.dp.yaml", [
      "version: 1",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
    ]);

    const result = loadValidatedDiagramSpec(sourcePath);

    assertFailedLoad(result, "validation");
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
