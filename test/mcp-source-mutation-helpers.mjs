import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeSource(tempRoot, fileName = "architecture.dp.yaml") {
  const docsPath = path.join(tempRoot, "docs");
  const sourcePath = path.join(docsPath, fileName);
  await mkdir(docsPath, { recursive: true });
  await writeFile(
    sourcePath,
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
  return sourcePath;
}

export async function callMutateSource(sourcePath, operation) {
  const { callDiagramPilotMcpTool } = await import("../packages/mcp/dist/index.js");
  return callDiagramPilotMcpTool("diagrampilot_mutate_source", {
    source_path: sourcePath,
    operation,
  });
}

export function assertMutationFailedWithoutWrites(result) {
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.ok, false);
  assert.equal(result.structuredContent.writtenPaths.length, 0);
}
