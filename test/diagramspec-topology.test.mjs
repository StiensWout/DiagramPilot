import assert from "node:assert/strict";
import test from "node:test";

import { createDiagramSpecTopology } from "../packages/core/dist/index.js";

function objectSummary(entry) {
  return {
    objectType: entry.objectType,
    id: entry.id,
    depth: entry.depth,
    parentGroupId: entry.parentGroupId,
    path: Array.from(entry.path),
  };
}

function traversalSummary(topology) {
  return topology.traversal.map(objectSummary);
}

function containedSummary(topology, groupId) {
  return Array.from(topology.containedObjectsByGroupId.get(groupId)).map(
    objectSummary,
  );
}

function assertTopologyRoots(topology, { rootNodes, rootGroups, parents }) {
  assert.deepEqual(
    topology.rootNodes.map((node) => node.id),
    rootNodes,
  );
  assert.deepEqual(
    topology.rootGroups.map((group) => group.id),
    rootGroups,
  );
  assert.deepEqual(
    Array.from(topology.parentGroupIdsByObjectId.entries()),
    parents,
  );
}

function assertNodePaths(topology, expectedPaths) {
  assert.deepEqual(Array.from(topology.nodePathsById.entries()), expectedPaths);
}

function topologyEntry(objectType, id, depth, parentGroupId, path) {
  return { objectType, id, depth, parentGroupId, path };
}

function nodeEntry(id, depth, parentGroupId, path) {
  return topologyEntry("node", id, depth, parentGroupId, path);
}

function groupEntry(id, depth, parentGroupId, path) {
  return topologyEntry("group", id, depth, parentGroupId, path);
}

function backendServicePath(id) {
  return ["backend_services", id];
}

function backendNodeEntry(id) {
  return nodeEntry(id, 1, "backend_services", backendServicePath(id));
}

test("createDiagramSpecTopology describes ungrouped root nodes", () => {
  const spec = {
    version: 1,
    title: "Ungrouped Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
      },
    ],
  };

  const topology = createDiagramSpecTopology(spec);

  assert.deepEqual(
    topology.rootNodes.map((node) => node.id),
    ["web_app", "api_gateway"],
  );
  assert.deepEqual(
    topology.rootGroups.map((group) => group.id),
    [],
  );
  assert.deepEqual(
    Array.from(topology.parentGroupIdsByObjectId.entries()),
    [],
  );
  assertNodePaths(topology, [
    ["web_app", ["web_app"]],
    ["api_gateway", ["api_gateway"]],
  ]);
  assert.deepEqual(traversalSummary(topology), [
    {
      objectType: "node",
      id: "web_app",
      depth: 0,
      parentGroupId: undefined,
      path: ["web_app"],
    },
    {
      objectType: "node",
      id: "api_gateway",
      depth: 0,
      parentGroupId: undefined,
      path: ["api_gateway"],
    },
  ]);
});

test("createDiagramSpecTopology describes one group and its contained nodes", () => {
  const spec = {
    version: 1,
    title: "Grouped Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_service", label: "Orders Service" },
    ],
    groups: [
      {
        id: "backend_services",
        label: "Backend Services",
        contains: ["api_gateway", "orders_service"],
      },
    ],
  };

  const topology = createDiagramSpecTopology(spec);

  assertTopologyRoots(topology, {
    rootNodes: ["web_app"],
    rootGroups: ["backend_services"],
    parents: [
      ["api_gateway", "backend_services"],
      ["orders_service", "backend_services"],
    ],
  });
  assert.deepEqual(
    containedSummary(topology, "backend_services"),
    [
      {
        objectType: "node",
        id: "api_gateway",
        depth: 1,
        parentGroupId: "backend_services",
        path: ["backend_services", "api_gateway"],
      },
      {
        objectType: "node",
        id: "orders_service",
        depth: 1,
        parentGroupId: "backend_services",
        path: ["backend_services", "orders_service"],
      },
    ],
  );
  assertNodePaths(topology, [
    ["web_app", ["web_app"]],
    ["api_gateway", backendServicePath("api_gateway")],
    ["orders_service", ["backend_services", "orders_service"]],
  ]);
  assert.deepEqual(traversalSummary(topology), [
    nodeEntry("web_app", 0, undefined, ["web_app"]),
    groupEntry("backend_services", 0, undefined, ["backend_services"]),
    backendNodeEntry("api_gateway"),
    nodeEntry("orders_service", 1, "backend_services", [
      "backend_services",
      "orders_service",
    ]),
  ]);
});

test("createDiagramSpecTopology describes nested groups and contained node paths", () => {
  const spec = {
    version: 1,
    title: "Nested Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_service", label: "Orders Service" },
      { id: "orders_db", label: "Orders DB" },
    ],
    groups: [
      {
        id: "backend_services",
        label: "Backend Services",
        contains: ["api_gateway", "orders_runtime"],
      },
      {
        id: "orders_runtime",
        label: "Orders Runtime",
        contains: ["orders_service", "orders_db"],
      },
    ],
  };

  const topology = createDiagramSpecTopology(spec);

  assertTopologyRoots(topology, {
    rootNodes: ["web_app"],
    rootGroups: ["backend_services"],
    parents: [
      ["api_gateway", "backend_services"],
      ["orders_runtime", "backend_services"],
      ["orders_service", "orders_runtime"],
      ["orders_db", "orders_runtime"],
    ],
  });
  assert.deepEqual(
    containedSummary(topology, "backend_services"),
    [
      {
        objectType: "node",
        id: "api_gateway",
        depth: 1,
        parentGroupId: "backend_services",
        path: ["backend_services", "api_gateway"],
      },
      {
        objectType: "group",
        id: "orders_runtime",
        depth: 1,
        parentGroupId: "backend_services",
        path: ["backend_services", "orders_runtime"],
      },
    ],
  );
  assert.deepEqual(
    containedSummary(topology, "orders_runtime"),
    [
      {
        objectType: "node",
        id: "orders_service",
        depth: 2,
        parentGroupId: "orders_runtime",
        path: ["backend_services", "orders_runtime", "orders_service"],
      },
      {
        objectType: "node",
        id: "orders_db",
        depth: 2,
        parentGroupId: "orders_runtime",
        path: ["backend_services", "orders_runtime", "orders_db"],
      },
    ],
  );
  assertNodePaths(topology, [
    ["web_app", ["web_app"]],
    ["api_gateway", backendServicePath("api_gateway")],
    [
      "orders_service",
      ["backend_services", "orders_runtime", "orders_service"],
    ],
    ["orders_db", ["backend_services", "orders_runtime", "orders_db"]],
  ]);
  assert.deepEqual(traversalSummary(topology), [
    nodeEntry("web_app", 0, undefined, ["web_app"]),
    groupEntry("backend_services", 0, undefined, ["backend_services"]),
    backendNodeEntry("api_gateway"),
    groupEntry("orders_runtime", 1, "backend_services", [
      "backend_services",
      "orders_runtime",
    ]),
    nodeEntry("orders_service", 2, "orders_runtime", [
      "backend_services",
      "orders_runtime",
      "orders_service",
    ]),
    nodeEntry("orders_db", 2, "orders_runtime", [
      "backend_services",
      "orders_runtime",
      "orders_db",
    ]),
  ]);
});

test("createDiagramSpecTopology classifies group containment references", () => {
  const spec = {
    version: 1,
    title: "Containment Reference Architecture",
    nodes: [
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_db", label: "Orders DB" },
    ],
    edges: [
      {
        id: "api_gateway_to_orders_db",
        from: "api_gateway",
        to: "orders_db",
      },
    ],
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: ["api_gateway", "services"],
      },
      {
        id: "services",
        label: "Services",
        contains: ["api_gateway_to_orders_db", "missing_service"],
      },
    ],
  };

  const topology = createDiagramSpecTopology(spec);

  assert.deepEqual(
    topology.containmentReferences.map((reference) => ({
      parentGroupId: reference.parentGroupId,
      parentGroupIndex: reference.parentGroupIndex,
      containedId: reference.containedId,
      containedIndex: reference.containedIndex,
      containedObjectType: reference.containedObjectType,
    })),
    [
      {
        parentGroupId: "backend",
        parentGroupIndex: 0,
        containedId: "api_gateway",
        containedIndex: 0,
        containedObjectType: "node",
      },
      {
        parentGroupId: "backend",
        parentGroupIndex: 0,
        containedId: "services",
        containedIndex: 1,
        containedObjectType: "group",
      },
      {
        parentGroupId: "services",
        parentGroupIndex: 1,
        containedId: "api_gateway_to_orders_db",
        containedIndex: 0,
        containedObjectType: "edge",
      },
      {
        parentGroupId: "services",
        parentGroupIndex: 1,
        containedId: "missing_service",
        containedIndex: 1,
        containedObjectType: "unknown",
      },
    ],
  );
});
