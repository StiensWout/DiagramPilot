import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { runBuiltCli, withTempRepo } from "./cli-smoke-helpers.mjs";
import {
  npmCommand,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntryPoint = path.join(repoRoot, "packages", "cli", "dist", "index.js");

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
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /DiagramPilot MCP server/);
  assert.match(result.stdout, new RegExp(`Usage: ${commandName}`));
  assert.match(result.stdout, /alpha DiagramPilot MCP server over stdio/);
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
      "",
    ].join("\n"),
    "utf8",
  );

  return sourcePath;
}

test("diagrampilot mcp --help documents the stdio MCP launch path", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["mcp", "--help"], tempRoot);

    assertMcpHelp(result, "diagrampilot mcp");
  });
});

test("diagrampilot-mcp --help documents the dedicated package executable", async () => {
  const result = await runMcpPackageExecutable(["--help"]);

  assertMcpHelp(result, "diagrampilot-mcp");
});

test("diagrampilot mcp starts a stdio MCP server with resources tools and prompts", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeSource(tempRoot);
    const client = new Client({
      name: "diagrampilot-mcp-test",
      version: "0.0.0",
    });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliEntryPoint, "mcp"],
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
          "diagrampilot_validate_source",
          "diagrampilot_check_repo",
          "diagrampilot_export_source",
          "diagrampilot_render_source",
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
