import assert from "node:assert/strict";
import test from "node:test";

import { lintDiagramSpec } from "../packages/core/dist/index.js";

function numberedNodes(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `service_${index + 1}`,
    label: `Service ${index + 1}`,
  }));
}

function chainEdges(nodes) {
  return nodes.slice(1).map((node, index) => ({
    id: `${nodes[index].id}_to_${node.id}`,
    from: nodes[index].id,
    to: node.id,
    label: "Calls",
    kind: "request",
  }));
}

test("lintDiagramSpec warns about orphan nodes", () => {
  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "worker", label: "Worker" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
        kind: "request",
      },
    ],
  });

  assert.deepEqual(result, {
    ok: false,
    summary: {
      warningCount: 1,
    },
    warnings: [
      {
        path: "nodes[2]",
        ruleId: "orphan-node",
        severity: "warning",
        message: 'Node "worker" is not connected to any edge.',
        suggestion:
          "Connect worker with at least one edge or remove it if it is not part of the architecture.",
      },
    ],
  });
});

test("lintDiagramSpec warns about unlabeled edges", () => {
  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        kind: "request",
      },
    ],
  });

  assert.deepEqual(result.warnings, [
    {
      path: "edges[0].label",
      ruleId: "unlabeled-edge",
      severity: "warning",
      message: 'Edge "web_app_to_api_gateway" does not have a label.',
      suggestion:
        "Add a concise label that describes the protocol, event, or data flow.",
    },
  ]);
});

test("lintDiagramSpec warns about missing edge kinds", () => {
  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
      },
    ],
  });

  assert.deepEqual(result.warnings, [
    {
      path: "edges[0].kind",
      ruleId: "missing-edge-kind",
      severity: "warning",
      message: 'Edge "web_app_to_api_gateway" does not have a kind.',
      suggestion:
        "Add an edge kind such as request, event, data_flow, dependency, or observability.",
    },
  ]);
});

test("lintDiagramSpec warns about duplicate node labels", () => {
  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "public_api", label: "API" },
      { id: "internal_api", label: "API" },
    ],
    edges: [
      {
        id: "public_api_to_internal_api",
        from: "public_api",
        to: "internal_api",
        label: "Routes",
        kind: "request",
      },
    ],
  });

  assert.deepEqual(result.warnings, [
    {
      path: "nodes[1].label",
      ruleId: "duplicate-node-label",
      severity: "warning",
      message: 'Node label "API" also appears at nodes[0].label.',
      suggestion:
        "Use distinct node labels or add clarifying words so reviewers can tell the concepts apart.",
    },
  ]);
});

test("lintDiagramSpec warns about duplicate group labels", () => {
  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    groups: [
      { id: "public_services", label: "Services", contains: ["web_app"] },
      { id: "private_services", label: "Services", contains: ["api_gateway"] },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
        kind: "request",
      },
    ],
  });

  assert.deepEqual(result.warnings, [
    {
      path: "groups[1].label",
      ruleId: "duplicate-group-label",
      severity: "warning",
      message: 'Group label "Services" also appears at groups[0].label.',
      suggestion:
        "Use distinct group labels or add clarifying words so reviewers can tell the boundaries apart.",
    },
  ]);
});

test("lintDiagramSpec warns about oversized groups", () => {
  const nodes = numberedNodes(13);

  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes,
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: nodes.map((node) => node.id),
      },
    ],
    edges: chainEdges(nodes),
  });

  assert.deepEqual(result.warnings, [
    {
      path: "groups[0].contains",
      ruleId: "oversized-group",
      severity: "warning",
      message: 'Group "backend" contains 13 direct objects; the lint threshold is 12.',
      suggestion:
        "Split the group into smaller groups or split the source before review.",
    },
  ]);
});

test("lintDiagramSpec warns about high fan-in nodes", () => {
  const sourceNodes = numberedNodes(7);

  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [{ id: "api_gateway", label: "API Gateway" }, ...sourceNodes],
    edges: sourceNodes.map((node) => ({
      id: `${node.id}_to_api_gateway`,
      from: node.id,
      to: "api_gateway",
      label: "Calls",
      kind: "request",
    })),
  });

  assert.deepEqual(result.warnings, [
    {
      path: "nodes[0]",
      ruleId: "high-fan-in",
      severity: "warning",
      message: 'Node "api_gateway" has 7 incoming edges; the lint threshold is 6.',
      suggestion:
        "Split the diagram or add grouping around this node before review.",
    },
  ]);
});

test("lintDiagramSpec warns about high fan-out nodes", () => {
  const targetNodes = numberedNodes(7);

  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes: [{ id: "api_gateway", label: "API Gateway" }, ...targetNodes],
    edges: targetNodes.map((node) => ({
      id: `api_gateway_to_${node.id}`,
      from: "api_gateway",
      to: node.id,
      label: "Calls",
      kind: "request",
    })),
  });

  assert.deepEqual(result.warnings, [
    {
      path: "nodes[0]",
      ruleId: "high-fan-out",
      severity: "warning",
      message: 'Node "api_gateway" has 7 outgoing edges; the lint threshold is 6.',
      suggestion:
        "Split the diagram or add grouping around this node before review.",
    },
  ]);
});

test("lintDiagramSpec warns when a diagram is too large or dense for review", () => {
  const nodes = numberedNodes(26);

  const result = lintDiagramSpec({
    version: 1,
    title: "Checkout Architecture",
    nodes,
    edges: chainEdges(nodes),
  });

  assert.deepEqual(result.warnings, [
    {
      path: "$",
      ruleId: "large-dense-diagram",
      severity: "warning",
      message:
        "Diagram has 51 objects and 0.96 edges per node; lint thresholds are 50 objects or 1.5 edges per node for diagrams with at least 20 nodes.",
      suggestion:
        "Split the diagram into smaller source files or reduce edge density before committing.",
    },
  ]);
});
