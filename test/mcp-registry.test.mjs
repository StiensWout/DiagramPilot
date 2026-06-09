import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
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

async function writeSource(tempRoot) {
  await mkdir(path.join(tempRoot, "docs"), { recursive: true });
  const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
  await writeFile(
    sourcePath,
    [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "  - id: api",
      "    label: API",
      "edges:",
      "  - id: web_app_to_api",
      "    from: web_app",
      "    to: api",
      "    label: calls",
      "",
    ].join("\n"),
    "utf8",
  );

  return sourcePath;
}

test("MCP registry exposes the public resource tool and prompt names", async () => {
  const {
    DIAGRAMPILOT_MCP_PROMPTS,
    DIAGRAMPILOT_MCP_RESOURCES,
    DIAGRAMPILOT_MCP_TOOLS,
  } = await importMcpPackage();

  assert.deepEqual(
    DIAGRAMPILOT_MCP_RESOURCES.map((resource) => resource.name),
    [
      "diagrampilot_schema_v1",
      "diagrampilot_docs",
      "diagrampilot_examples",
      "diagrampilot_discovered_sources",
      "diagrampilot_check_results",
    ],
  );
  assert.deepEqual(
    DIAGRAMPILOT_MCP_TOOLS.map((tool) => tool.name),
    [
      "diagrampilot_validate_source",
      "diagrampilot_check_repo",
      "diagrampilot_export_source",
      "diagrampilot_render_source",
    ],
  );
  assert.deepEqual(
    DIAGRAMPILOT_MCP_PROMPTS.map((prompt) => prompt.name),
    [
      "create_or_update_diagrampilot_source",
      "repair_diagrampilot_validation_errors",
      "refresh_diagrampilot_artifacts",
    ],
  );
  assert.equal(
    DIAGRAMPILOT_MCP_TOOLS.every(
      (tool) =>
        tool.annotations?.readOnlyHint === true &&
        tool.annotations?.destructiveHint === false,
    ),
    true,
  );
});

test("MCP prompt names and arguments are stable public behavior", async () => {
  const { DIAGRAMPILOT_MCP_PROMPTS, getDiagramPilotMcpPrompt } =
    await importMcpPackage();

  assert.deepEqual(
    Object.fromEntries(
      DIAGRAMPILOT_MCP_PROMPTS.map((prompt) => [
        prompt.name,
        prompt.arguments.map((argument) => argument.name),
      ]),
    ),
    {
      create_or_update_diagrampilot_source: [
        "goal",
        "scope_path",
        "source_path",
      ],
      repair_diagrampilot_validation_errors: [
        "source_path",
        "validation_errors",
      ],
      refresh_diagrampilot_artifacts: ["scope_path"],
    },
  );

  const prompt = getDiagramPilotMcpPrompt("refresh_diagrampilot_artifacts", {
    scope_path: "docs",
  });

  assert.equal(prompt.description, "Refresh DiagramPilot Derived Artifacts");
  assert.match(prompt.messages[0].content.text, /diagrampilot check docs/);
  assert.match(prompt.messages[0].content.text, /diagrampilot generate docs/);
});

test("MCP resources read schema docs examples discovered sources and check results", async () => {
  const { readDiagramPilotMcpResource } = await importMcpPackage();

  await withTempRepo(async (tempRoot) => {
    await writeSource(tempRoot);
    const docsScope = encodeURIComponent(tempRoot);
    const schema = await readDiagramPilotMcpResource("diagrampilot://schema/v1");
    const docs = await readDiagramPilotMcpResource("diagrampilot://docs/mcp");
    const examples = await readDiagramPilotMcpResource("diagrampilot://examples/checkout");
    const sources = await readDiagramPilotMcpResource(
      `diagrampilot://sources/${docsScope}`,
    );
    const check = await readDiagramPilotMcpResource(
      `diagrampilot://check/${docsScope}`,
    );

    assert.equal(schema.mimeType, "application/schema+json");
    assert.match(schema.text, /"title": "DiagramSpec v1"/);
    assert.equal(docs.mimeType, "text/markdown");
    assert.match(docs.text, /MCP support is alpha/);
    assert.equal(examples.mimeType, "text/markdown");
    assert.match(examples.text, /Checkout Architecture/);
    assert.equal(sources.mimeType, "application/json");
    assert.deepEqual(JSON.parse(sources.text).sources, [
      {
        relativePath: "docs/architecture.dp.yaml",
      },
    ]);
    assert.equal(check.mimeType, "application/json");
    assert.deepEqual(JSON.parse(check.text).summary, {
      checkedSourceCount: 1,
      freshSourceCount: 0,
      issueCount: 1,
    });
  });
});

test("MCP read tools validate check export and render without writing files", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");

    const validation = await callDiagramPilotMcpTool(
      "diagrampilot_validate_source",
      { source_path: sourcePath },
    );
    const check = await callDiagramPilotMcpTool("diagrampilot_check_repo", {
      scope_path: tempRoot,
    });
    const exported = await callDiagramPilotMcpTool(
      "diagrampilot_export_source",
      { source_path: sourcePath, format: "mermaid" },
    );
    const rendered = await callDiagramPilotMcpTool(
      "diagrampilot_render_source",
      { source_path: sourcePath },
      {
        renderDiagramSpecToSvg: async () => "<svg><title>Checkout Architecture</title></svg>",
      },
    );

    assert.deepEqual(validation.structuredContent, { ok: true, errorCount: 0 });
    assert.deepEqual(check.structuredContent.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 0,
      issueCount: 1,
    });
    assert.match(exported.content[0].text, /^flowchart LR/m);
    assert.match(rendered.content[0].text, /^<svg>/);
    assert.equal(await exists(artifactPath), false);
  });
});
