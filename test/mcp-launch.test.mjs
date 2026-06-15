import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

import { repoRoot, runBuiltCli, withTempRepo } from "./cli-smoke-helpers.mjs";
import { writeSource } from "./mcp-source-mutation-helpers.mjs";
import {
  assertProcessSuccess,
  npmCommand,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const mcpEntryPoint = path.join(repoRoot, "packages", "mcp", "dist", "index.js");
const requireFromMcpPackage = createRequire(
  path.join(repoRoot, "packages", "mcp", "package.json"),
);
const { Client } = await import(
  requireFromMcpPackage.resolve("@modelcontextprotocol/sdk/client/index.js")
);
const { StdioClientTransport } = await import(
  requireFromMcpPackage.resolve("@modelcontextprotocol/sdk/client/stdio.js")
);

function runMcpPackageExecutable(args) {
  return runProcess(
    npmCommand,
    ["exec", "--workspace", "@diagrampilot/mcp", "--", "diagrampilot-mcp", ...args],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv(),
    },
  );
}

function assertMcpHelp(result, commandName) {
  assertProcessSuccess(result);
  assert.match(result.stdout, /DiagramPilot MCP server/);
  assert.match(result.stdout, new RegExp(`Usage: ${commandName}`));
  assert.match(result.stdout, /DiagramPilot MCP server over stdio/);
}

test("diagrampilot mcp --help points users to the optional MCP package", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["mcp", "--help"], tempRoot);

    assertProcessSuccess(result);
    assert.match(
      result.stdout,
      /DiagramPilot MCP moved to the optional @diagrampilot\/mcp package/,
    );
    assert.match(result.stdout, /npm install --save-dev @diagrampilot\/mcp/);
    assert.match(result.stdout, /diagrampilot-mcp/);
    assert.doesNotMatch(result.stdout, /Usage: diagrampilot mcp/);
  });
});

test("diagrampilot mcp reports the optional MCP package instead of launching the server", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["mcp"], tempRoot);

    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramPilot MCP moved to the optional @diagrampilot\/mcp package/,
    );
    assert.match(result.stderr, /npm install --save-dev @diagrampilot\/mcp/);
    assert.match(result.stderr, /diagrampilot-mcp/);
  });
});

test("diagrampilot-mcp --help documents the dedicated package executable", async () => {
  const result = await runMcpPackageExecutable(["--help"]);

  assertMcpHelp(result, "diagrampilot-mcp");
});

test("diagrampilot-mcp starts a stdio MCP server with resources tools and prompts", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);
    const client = new Client({
      name: "diagrampilot-mcp-test",
      version: "0.0.0",
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpEntryPoint],
      cwd: tempRoot,
      stderr: "pipe",
    });

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      const templates = await client.listResourceTemplates();
      const prompts = await client.listPrompts();
      const schema = await client.readResource({
        uri: "diagrampilot://schema/v1",
      });
      const validation = await client.callTool({
        name: "diagrampilot_validate_source",
        arguments: {
          source_path: sourcePath,
        },
      });

      assert.deepEqual(
        tools.tools.map((tool) => tool.name),
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
        templates.resourceTemplates.map((resource) => resource.name),
        [
          "diagrampilot_schema_v1",
          "diagrampilot_docs",
          "diagrampilot_examples",
          "diagrampilot_discovered_sources",
          "diagrampilot_check_results",
        ],
      );
      assert.deepEqual(
        prompts.prompts.map((prompt) => prompt.name),
        [
          "create_or_update_diagrampilot_source",
          "repair_diagrampilot_validation_errors",
          "refresh_diagrampilot_artifacts",
        ],
      );
      assert.match(schema.contents[0].text, /"title": "DiagramSpec v1"/);
      assert.deepEqual(validation.structuredContent, {
        ok: true,
        errorCount: 0,
      });
    } finally {
      await client.close();
    }
  });
});
