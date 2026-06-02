import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadDiagramPilotSourceFile,
  validateDiagramSpec,
} from "../packages/core/dist/index.js";

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-core-"));

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

test("validateDiagramSpec preserves unknown metadata keys on a loaded DiagramSpec", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "metadata.dp.yaml");

    await writeFile(
      sourcePath,
      [
        "version: 1",
        "title: Metadata Extension Architecture",
        "metadata:",
        "  review_owner: platform_team",
        "  lifecycle:",
        "    stage: beta",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    metadata:",
        "      review_owner: api_team",
        "      codeowners:",
        "        - platform_team",
        "  - id: orders_service",
        "    label: Orders Service",
        "edges:",
        "  - id: api_gateway_to_orders_service",
        "    from: api_gateway",
        "    to: orders_service",
        "    metadata:",
        "      protocol_hint: grpc",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    contains:",
        "      - orders_service",
        "    metadata:",
        "      boundary_owner: architecture_team",
        "",
      ].join("\n"),
      "utf8",
    );

    const loadResult = loadDiagramPilotSourceFile(sourcePath);

    assert.equal(loadResult.ok, true);

    const spec = loadResult.source.value;
    const validation = validateDiagramSpec(spec);

    assert.equal(validation.ok, true);
    assert.equal(spec.metadata.review_owner, "platform_team");
    assert.deepEqual(spec.metadata.lifecycle, { stage: "beta" });
    assert.deepEqual(spec.nodes[0].metadata, {
      review_owner: "api_team",
      codeowners: ["platform_team"],
    });
    assert.equal(spec.edges[0].metadata.protocol_hint, "grpc");
    assert.equal(spec.groups[0].metadata.boundary_owner, "architecture_team");
  });
});
