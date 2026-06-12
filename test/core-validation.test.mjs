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

function validationErrorFacts(errors) {
  return errors.map((error) => ({
    path: error.path,
    message: error.message,
    badValue: error.badValue,
    expected: error.expected,
    suggestion: error.suggestion,
  }));
}

function validateDiagramSpecWithoutMutation(spec) {
  const sourceBeforeValidation = JSON.stringify(spec);
  const validation = validateDiagramSpec(spec);

  assert.equal(JSON.stringify(spec), sourceBeforeValidation);
  return validation;
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
  const validation = validateDiagramSpecWithoutMutation(spec);

  assert.equal(validation.ok, false);
  assert.deepEqual(
    validationErrorFacts(validation.errors),
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

test("validateDiagramSpec reports repairable view filter failures", () => {
  const spec = {
    version: 1,
    title: "View Filter Architecture",
    nodes: [
      { id: "api_gateway", label: "API Gateway", kind: "service" },
      { id: "orders_service", label: "Orders Service", kind: "service" },
    ],
    edges: [
      {
        id: "api_gateway_to_orders_service",
        from: "api_gateway",
        to: "orders_service",
        kind: "request",
      },
    ],
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: ["orders_service"],
      },
    ],
    views: [
      { id: "runtime", groups: ["backend"] },
      { id: "runtime", nodes: ["api_gateway"] },
      { id: "unmatched", nodeKinds: ["worker"] },
      {
        id: "broken_refs",
        groups: ["missing_group"],
        nodes: ["missing_node"],
        edges: ["missing_edge"],
      },
    ],
  };
  const validation = validateDiagramSpecWithoutMutation(spec);

  assert.equal(validation.ok, false);
  assert.deepEqual(
    validationErrorFacts(validation.errors),
    [
      {
        path: "views[1].id",
        message: 'views[1].id duplicates views[0].id "runtime".',
        badValue: "runtime",
        expected: "One unique stable ID per DiagramSpec view.",
        suggestion: "Assign a unique stable ID to this view.",
      },
      {
        path: "views[3].groups[0]",
        message:
          'views[3].groups[0] references unknown group "missing_group".',
        badValue: "missing_group",
        expected: "One of: backend.",
        suggestion:
          'Add a group with id "missing_group" or change views[3].groups[0] to an existing group ID.',
      },
      {
        path: "views[3].nodes[0]",
        message: 'views[3].nodes[0] references unknown node "missing_node".',
        badValue: "missing_node",
        expected: "One of: api_gateway, orders_service.",
        suggestion:
          'Add a node with id "missing_node" or change views[3].nodes[0] to an existing node ID.',
      },
      {
        path: "views[3].edges[0]",
        message: 'views[3].edges[0] references unknown edge "missing_edge".',
        badValue: "missing_edge",
        expected: "One of: api_gateway_to_orders_service.",
        suggestion:
          'Add an edge with id "missing_edge" or change views[3].edges[0] to an existing edge ID.',
      },
      {
        path: "views[2]",
        message: 'View "unmatched" filters do not match any diagram objects.',
        badValue: {
          id: "unmatched",
          nodeKinds: ["worker"],
        },
        expected: "At least one matching node, edge, or group.",
        suggestion:
          "Change the view filters to reference existing groups, nodes, edges, node kinds, or edge kinds.",
      },
    ],
  );
});
