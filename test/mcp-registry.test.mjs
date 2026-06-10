import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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

async function withTempRepoCwd(run) {
  await withTempRepo(async (tempRoot) => {
    const previousCwd = process.cwd();
    process.chdir(tempRoot);

    try {
      await run(tempRoot);
    } finally {
      process.chdir(previousCwd);
    }
  });
}

async function writeArtifactConfig(tempRoot, outputPath) {
  await writeFile(
    path.join(tempRoot, "diagrampilot.config.yaml"),
    [
      "version: 1",
      "artifacts:",
      "  - source: docs/architecture.dp.yaml",
      "    outputs:",
      "      - format: svg",
      `        path: ${outputPath}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

async function writeInvalidSource(tempRoot) {
  await mkdir(path.join(tempRoot, "docs"), { recursive: true });
  await writeFile(
    path.join(tempRoot, "docs", "invalid.dp.yaml"),
    ["version: 1", "nodes:", "  - id: web_app", "    label: Web App", ""].join(
      "\n",
    ),
    "utf8",
  );
}

function assertToolAnnotations(tool, expected) {
  assert.equal(tool.annotations?.readOnlyHint, expected.readOnly);
  assert.equal(tool.annotations?.destructiveHint, expected.destructive);
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
      "diagrampilot_suggest_stable_ids",
      "diagrampilot_validate_source",
      "diagrampilot_check_repo",
      "diagrampilot_export_source",
      "diagrampilot_render_source",
      "diagrampilot_create_source",
      "diagrampilot_mutate_source",
      "diagrampilot_generate_repo_outputs",
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
  const toolsByName = Object.fromEntries(
    DIAGRAMPILOT_MCP_TOOLS.map((tool) => [tool.name, tool]),
  );

  for (const name of [
    "diagrampilot_suggest_stable_ids",
    "diagrampilot_validate_source",
    "diagrampilot_check_repo",
    "diagrampilot_export_source",
    "diagrampilot_render_source",
  ]) {
    assertToolAnnotations(toolsByName[name], {
      readOnly: true,
      destructive: false,
    });
  }

  assertToolAnnotations(toolsByName.diagrampilot_generate_repo_outputs, {
    readOnly: false,
    destructive: true,
  });
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

test("MCP generate tool writes explicit source scopes and returns structured summaries", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    await writeSource(tempRoot);
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");

    const generated = await callDiagramPilotMcpTool(
      "diagrampilot_generate_repo_outputs",
      { source_paths: ["docs/architecture.dp.yaml"] },
      {
        renderDiagramSpecToSvg: async () =>
          "<svg><title>Checkout Architecture</title></svg>",
      },
    );

    assert.equal(generated.isError, undefined);
    assert.deepEqual(generated.structuredContent.summary, {
      checkedSourceCount: 1,
      writtenArtifactCount: 1,
      skippedArtifactCount: 0,
      failureCount: 0,
    });
    assert.deepEqual(generated.structuredContent.written, [
      {
        sourcePath: "docs/architecture.dp.yaml",
        format: "svg",
        path: "docs/architecture.svg",
      },
    ]);
    assert.deepEqual(generated.structuredContent.skipped, []);
    assert.deepEqual(generated.structuredContent.failures, []);
    assert.equal(
      await readFile(artifactPath, "utf8"),
      "<svg><title>Checkout Architecture</title></svg>",
    );
    assert.doesNotMatch(generated.content[0].text, /<svg>/);
  });
});

test("MCP generate tool rejects calls without explicit source paths or scopes", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  const generated = await callDiagramPilotMcpTool(
    "diagrampilot_generate_repo_outputs",
    {},
  );

  assert.equal(generated.isError, true);
  assert.equal(generated.structuredContent.ok, false);
  assert.match(generated.content[0].text, /no whole-repo default/i);
  assert.deepEqual(generated.structuredContent.errors[0], {
    path: "source_paths",
    message: "Provide at least one explicit source_paths or scope_paths entry.",
    expected:
      "A non-empty array of DiagramPilot Source File paths or directory scopes.",
    suggestion:
      "Call diagrampilot_generate_repo_outputs with source_paths or scope_paths.",
  });
});

test("MCP generate tool writes configured outputs for explicit directory scopes", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    await writeSource(tempRoot);
    await writeFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      [
        "version: 1",
        "artifacts:",
        "  - source: docs/architecture.dp.yaml",
        "    outputs:",
        "      - format: svg",
        "        path: generated/{stem}.svg",
        "      - format: mermaid",
        "        path: generated/{stem}.mmd",
        "",
      ].join("\n"),
      "utf8",
    );

    const generated = await callDiagramPilotMcpTool(
      "diagrampilot_generate_repo_outputs",
      { scope_paths: ["docs"] },
      {
        renderDiagramSpecToSvg: async () =>
          "<svg><title>Checkout Architecture</title></svg>",
      },
    );

    assert.equal(generated.isError, undefined);
    assert.deepEqual(
      generated.structuredContent.written.map(
        ({ sourcePath, format, path: outputPath }) => ({
          sourcePath,
          format,
          path: outputPath,
        }),
      ),
      [
        {
          sourcePath: "architecture.dp.yaml",
          format: "svg",
          path: "generated/architecture.svg",
        },
        {
          sourcePath: "architecture.dp.yaml",
          format: "mermaid",
          path: "generated/architecture.mmd",
        },
      ],
    );
    assert.deepEqual(generated.structuredContent.skipped, []);
    assert.equal(
      await readFile(path.join(tempRoot, "generated", "architecture.mmd"), "utf8"),
      "flowchart LR\n  web_app[\"Web App\"]\n  api[\"API\"]\n  web_app -->|calls| api\n",
    );
    assert.doesNotMatch(generated.content[0].text, /flowchart LR/);
  });
});

test("MCP generate tool returns repairable failures without writes", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    await writeInvalidSource(tempRoot);

    const generated = await callDiagramPilotMcpTool(
      "diagrampilot_generate_repo_outputs",
      { source_paths: ["docs/invalid.dp.yaml"] },
    );

    assert.equal(generated.isError, true);
    assert.equal(generated.structuredContent.ok, false);
    assert.deepEqual(generated.structuredContent.written, []);
    assert.equal(
      generated.structuredContent.failures[0].sourcePath,
      "docs/invalid.dp.yaml",
    );
    assert.equal(generated.structuredContent.failures[0].errors[0].path, "title");
    assert.equal(await exists(path.join(tempRoot, "docs", "invalid.svg")), false);
  });
});

test("MCP generate tool returns unsafe output path diagnostics without writes", async () => {
  const { callDiagramPilotMcpTool } = await importMcpPackage();

  await withTempRepoCwd(async (tempRoot) => {
    await writeSource(tempRoot);
    await writeArtifactConfig(tempRoot, "../outside.svg");

    const generated = await callDiagramPilotMcpTool(
      "diagrampilot_generate_repo_outputs",
      { scope_paths: ["docs"] },
    );

    assert.equal(generated.isError, true);
    assert.equal(generated.structuredContent.ok, false);
    assert.deepEqual(generated.structuredContent.written, []);
    assert.equal(generated.structuredContent.failure.kind, "invalid-config");
    assert.match(
      generated.structuredContent.failure.message,
      /Artifact output paths must stay within the config directory tree/,
    );
    assert.equal(await exists(path.join(tempRoot, "..", "outside.svg")), false);
  });
});
