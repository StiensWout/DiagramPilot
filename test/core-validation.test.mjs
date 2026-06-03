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

test("validateDiagramSpec reports repairable containment failures without rewriting the source object", () => {
  const spec = {
    version: 1,
    title: "Broken Containment Architecture",
    nodes: [
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_db", label: "Orders DB" },
    ],
    edges: [
      {
        id: "api_gateway_to_orders_db",
        from: "api_gateway",
        to: "backend",
      },
    ],
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: ["services", "orders_db"],
      },
      {
        id: "services",
        label: "Services",
        contains: [
          "backend",
          "api_gateway_to_orders_db",
          "missing_service",
          "orders_db",
        ],
      },
    ],
  };
  const sourceBeforeValidation = JSON.stringify(spec);

  const validation = validateDiagramSpec(spec);

  assert.equal(validation.ok, false);
  assert.equal(JSON.stringify(spec), sourceBeforeValidation);
  assert.deepEqual(
    validation.errors.map((error) => ({
      path: error.path,
      message: error.message,
      badValue: error.badValue,
      expected: error.expected,
      suggestion: error.suggestion,
    })),
    [
      {
        path: "groups[1].contains[1]",
        message:
          'groups[1].contains[1] references edge "api_gateway_to_orders_db"; groups can contain nodes and groups only.',
        badValue: "api_gateway_to_orders_db",
        expected: "One of: api_gateway, orders_db, backend, services.",
        suggestion:
          "Remove groups[1].contains[1] or change it to an existing node or group ID.",
      },
      {
        path: "groups[1].contains[2]",
        message:
          'groups[1].contains[2] references unknown node or group "missing_service".',
        badValue: "missing_service",
        expected: "One of: api_gateway, orders_db, backend, services.",
        suggestion:
          'Add a node or group with id "missing_service" or change groups[1].contains[2] to an existing node or group ID.',
      },
      {
        path: "groups[1].contains[3]",
        message:
          'groups[1].contains[3] contains "orders_db", which is already contained by group "backend".',
        badValue: "orders_db",
        expected: "Each contained node or group can have at most one parent group.",
        suggestion:
          'Remove groups[1].contains[3] or choose a single parent group for "orders_db".',
      },
      {
        path: "groups[1].contains[0]",
        message:
          "groups[1].contains[0] creates a group containment cycle: backend -> services -> backend.",
        badValue: "backend",
        expected: "Acyclic group containment.",
        suggestion: "Remove one group containment reference from the cycle.",
      },
      {
        path: "edges[0].to",
        message:
          'edges[0].to references group "backend"; edges must reference node IDs.',
        badValue: "backend",
        expected: "One of: api_gateway, orders_db.",
        suggestion:
          "Change edges[0].to to an existing node ID instead of a group ID.",
      },
    ],
  );
});
