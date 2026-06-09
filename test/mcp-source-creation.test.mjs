import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { withTempRepo } from "./cli-smoke-helpers.mjs";

async function importMcpPackage() {
  return import("../packages/mcp/dist/index.js");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function withTempRepoCwd(run) {
  await withTempRepo(async (tempRoot) => {
    const originalCwd = process.cwd();
    process.chdir(tempRoot);

    try {
      await run(tempRoot);
    } finally {
      process.chdir(originalCwd);
    }
  });
}

function oneNodeDiagram(node) {
  return {
    version: 1,
    title: "Checkout Architecture",
    nodes: [node],
  };
}

async function callCreateSource(sourcePath, diagram) {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  return callDiagramPilotMcpTool("diagrampilot_create_source", {
    source_path: sourcePath,
    diagram,
  });
}

async function assertRejectedWithoutWrite(created, sourcePath, errorPath) {
  assert.equal(created.isError, true);
  assert.equal(created.structuredContent.ok, false);
  assert.deepEqual(created.structuredContent.writtenPaths, []);
  assert.equal(created.structuredContent.errors[0].path, errorPath);
  assert.equal(await exists(sourcePath), false);
}

test("MCP create source tool writes valid structured input as canonical YAML", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "checkout.dp.yaml");

    const created = await callDiagramPilotMcpTool("diagrampilot_create_source", {
      source_path: sourcePath,
      diagram: {
        version: 1,
        title: "Checkout Architecture",
        direction: "right",
        nodes: [
          { id: "web_app", label: "Web App" },
          { id: "api", label: "API" },
        ],
        edges: [
          {
            id: "web_app_to_api",
            from: "web_app",
            to: "api",
            label: "Calls",
          },
        ],
      },
    });

    assert.equal(created.isError, undefined);
    assert.deepEqual(created.structuredContent, {
      ok: true,
      sourcePath,
      writtenPaths: [sourcePath],
      before: { exists: false },
      after: {
        exists: true,
        valid: true,
        nodeCount: 2,
        edgeCount: 1,
        groupCount: 0,
      },
    });
    assert.equal(
      await readFile(sourcePath, "utf8"),
      [
        "version: 1",
        "title: Checkout Architecture",
        "direction: right",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api",
        "    label: API",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: Calls",
        "",
      ].join("\n"),
    );
    assert.doesNotMatch(created.content[0].text, /from: web_app/);
  });
});

test("MCP create source tool rejects missing stable IDs without writing", async () => {
  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "missing-id.dp.yaml");
    const created = await callCreateSource(
      sourcePath,
      oneNodeDiagram({ label: "Web App" }),
    );

    await assertRejectedWithoutWrite(created, sourcePath, "nodes[0].id");
  });
});

test("MCP create source tool rejects invalid stable IDs without writing", async () => {
  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "invalid-id.dp.yaml");
    const created = await callCreateSource(
      sourcePath,
      oneNodeDiagram({ id: "WebApp", label: "Web App" }),
    );

    await assertRejectedWithoutWrite(created, sourcePath, "nodes[0].id");
    assert.match(created.structuredContent.errors[0].expected, /^\^\[a-z\]/);
  });
});

test("MCP create source tool rejects duplicate stable IDs without writing", async () => {
  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "duplicate-id.dp.yaml");
    const created = await callCreateSource(sourcePath, {
        version: 1,
        title: "Checkout Architecture",
        nodes: [
          { id: "web_app", label: "Web App" },
          { id: "web_app", label: "API" },
        ],
    });

    await assertRejectedWithoutWrite(created, sourcePath, "nodes[1].id");
    assert.match(created.structuredContent.errors[0].message, /duplicates/);
  });
});

test("MCP create source tool rejects non-YAML source paths without writing", async () => {
  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "checkout.dp.json");
    const created = await callCreateSource(
      sourcePath,
      oneNodeDiagram({ id: "web_app", label: "Web App" }),
    );

    await assertRejectedWithoutWrite(created, sourcePath, "source_path");
    assert.match(created.structuredContent.errors[0].message, /\*\.dp\.yaml/);
  });
});

test("MCP suggest stable IDs returns valid unique IDs without writing", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "suggestions.dp.yaml");
    const suggested = await callDiagramPilotMcpTool("diagrampilot_suggest_stable_ids", {
      labels: ["Web App", "API Gateway", "Web App"],
      existing_ids: ["web_app"],
    });

    assert.equal(suggested.isError, undefined);
    assert.deepEqual(suggested.structuredContent, {
      ok: true,
      suggestions: [
        { label: "Web App", id: "web_app_2" },
        { label: "API Gateway", id: "api_gateway" },
        { label: "Web App", id: "web_app_3" },
      ],
    });
    assert.equal(await exists(sourcePath), false);
  });
});
