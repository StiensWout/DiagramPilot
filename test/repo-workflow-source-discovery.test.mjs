import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { discoverDiagramPilotSourceFiles } from "../packages/core/dist/index.js";
import { assertYamlSourceRepairHint } from "./source-format-assertions.mjs";

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-source-discovery-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test("discoverDiagramPilotSourceFiles returns one explicit DiagramPilot source file", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(
      sourcePath,
      ["version: 1", "title: Architecture", "nodes:", "  - id: web_app", "    label: Web App", ""].join("\n"),
      "utf8",
    );

    const result = await discoverDiagramPilotSourceFiles(sourcePath);

    assert.equal(result.ok, true);
    assert.equal(result.scope.kind, "file");
    assert.equal(result.scope.path, sourcePath);
    assert.deepEqual(result.sources, [
      {
        absolutePath: sourcePath,
        relativePath: "architecture.dp.yaml",
      },
    ]);
  });
});

test("discoverDiagramPilotSourceFiles rejects an explicit unsupported source extension", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yml");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "version: 1\n", "utf8");

    const result = await discoverDiagramPilotSourceFiles(sourcePath);

    assert.equal(result.ok, false);
    assert.deepEqual(result.failure, {
      kind: "unsupported-source-path",
      path: sourcePath,
      message: `Unsupported DiagramPilot source file: ${sourcePath}`,
    });
  });
});

test("discoverDiagramPilotSourceFiles rejects an explicit JSON source path with a YAML repair hint", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.json");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(
      sourcePath,
      JSON.stringify({
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      }),
      "utf8",
    );

    const result = await discoverDiagramPilotSourceFiles(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.failure.kind, "unsupported-source-path");
    assert.equal(result.failure.path, sourcePath);
    assertYamlSourceRepairHint(result.failure.message);
  });
});

test("discoverDiagramPilotSourceFiles recursively finds YAML sources in stable normalized relative path order", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs", "nested"), { recursive: true });
    await mkdir(path.join(tempRoot, "node_modules", "pkg"), {
      recursive: true,
    });
    await mkdir(path.join(tempRoot, ".git", "refs"), { recursive: true });
    await mkdir(path.join(tempRoot, "dist"), { recursive: true });
    await mkdir(path.join(tempRoot, "build"), { recursive: true });
    await mkdir(path.join(tempRoot, "coverage"), { recursive: true });
    await mkdir(path.join(tempRoot, ".next"), { recursive: true });
    await mkdir(path.join(tempRoot, ".vite"), { recursive: true });
    await mkdir(path.join(tempRoot, ".turbo"), { recursive: true });
    await mkdir(path.join(tempRoot, "src"), { recursive: true });

    await writeFile(
      path.join(tempRoot, "docs", "b.dp.yaml"),
      "version: 1\ntitle: B\nnodes:\n  - id: b\n    label: B\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "nested", "legacy.dp.json"),
      JSON.stringify({
        version: 1,
        title: "Legacy JSON Source",
        nodes: [{ id: "legacy", label: "Legacy JSON Source" }],
      }),
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "src", "invalid.dp.yaml"),
      "this is not a valid diagramspec source",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "node_modules", "pkg", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, ".git", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "dist", "ignored.dp.json"),
      "{}",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "build", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "coverage", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, ".next", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, ".vite", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, ".turbo", "ignored.dp.yaml"),
      "version: 1\n",
      "utf8",
    );

    const result = await discoverDiagramPilotSourceFiles(tempRoot);

    assert.equal(result.ok, true);
    assert.equal(result.scope.kind, "directory");
    assert.equal(result.scope.path, tempRoot);
    assert.deepEqual(
      result.sources.map((source) => source.relativePath),
      ["docs/b.dp.yaml", "src/invalid.dp.yaml"],
    );
    assert.equal(
      result.sources.every((source) => source.absolutePath.startsWith(tempRoot)),
      true,
    );
  });
});

test("discoverDiagramPilotSourceFiles uses the current working directory when no scope path is provided", async () => {
  await withTempRepo(async (tempRoot) => {
    const originalCwd = process.cwd();
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(
      sourcePath,
      "version: 1\ntitle: Architecture\nnodes:\n  - id: web_app\n    label: Web App\n",
      "utf8",
    );

    process.chdir(tempRoot);

    try {
      const result = await discoverDiagramPilotSourceFiles();

      assert.equal(result.ok, true);
      assert.equal(result.scope.kind, "directory");
      assert.equal(result.scope.path, tempRoot);
      assert.deepEqual(result.sources, [
        {
          absolutePath: sourcePath,
          relativePath: "docs/architecture.dp.yaml",
        },
      ]);
    } finally {
      process.chdir(originalCwd);
    }
  });
});

test("discoverDiagramPilotSourceFiles succeeds as a no-op when a directory has no DiagramPilot source files", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(path.join(tempRoot, "docs", "README.md"), "# Docs\n", "utf8");

    const result = await discoverDiagramPilotSourceFiles(tempRoot);

    assert.equal(result.ok, true);
    assert.equal(result.scope.kind, "directory");
    assert.deepEqual(result.sources, []);
  });
});
