import assert from "node:assert/strict";
import test from "node:test";

import { diffDiagramSpecs } from "../packages/core/dist/index.js";

function baseSpec() {
  return {
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      {
        id: "web_app",
        label: "Web App",
        kind: "frontend",
        icon: "lucide:monitor",
        metadata: { owner: "web" },
      },
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_service", label: "Orders Service" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "calls",
        kind: "https",
        directed: true,
        metadata: { protocol: "https" },
      },
      {
        id: "api_gateway_to_orders_service",
        from: "api_gateway",
        to: "orders_service",
      },
    ],
    groups: [
      {
        id: "checkout_runtime",
        label: "Checkout Runtime",
        contains: ["api_gateway", "orders_service"],
        metadata: { tier: "runtime" },
      },
    ],
  };
}

test("diffDiagramSpecs reports added, removed, and changed objects by Stable ID without mutating sources", () => {
  const before = baseSpec();
  const after = {
    ...baseSpec(),
    nodes: [
      {
        id: "web_app",
        label: "Web Frontend",
        kind: "frontend",
        icon: "lucide:globe",
        metadata: { owner: "experience" },
      },
      { id: "api_gateway", label: "API Gateway" },
      { id: "billing_service", label: "Billing Service" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "billing_service",
        label: "submits order",
        kind: "command",
        directed: false,
        metadata: { protocol: "grpc" },
      },
      {
        id: "web_app_to_billing_service",
        from: "web_app",
        to: "billing_service",
      },
    ],
    groups: [
      {
        id: "checkout_runtime",
        label: "Checkout Runtime v2",
        contains: ["api_gateway", "billing_service"],
        metadata: { tier: "runtime", changed: true },
      },
    ],
  };
  const beforeSnapshot = JSON.stringify(before);
  const afterSnapshot = JSON.stringify(after);

  const diff = diffDiagramSpecs(before, after);

  assert.equal(JSON.stringify(before), beforeSnapshot);
  assert.equal(JSON.stringify(after), afterSnapshot);
  assert.deepEqual(diff.summary, {
    added: { nodes: 1, edges: 1, groups: 0 },
    removed: { nodes: 1, edges: 1, groups: 0 },
    changed: { nodes: 1, edges: 1, groups: 1 },
  });
  assert.deepEqual(diff.nodes.added.map((change) => change.id), [
    "billing_service",
  ]);
  assert.deepEqual(diff.nodes.removed.map((change) => change.id), [
    "orders_service",
  ]);
  assert.deepEqual(diff.nodes.changed, [
    {
      id: "web_app",
      before: before.nodes[0],
      after: after.nodes[0],
      fields: ["label", "icon", "metadata"],
    },
  ]);
  assert.deepEqual(diff.edges.changed, [
    {
      id: "web_app_to_api_gateway",
      before: before.edges[0],
      after: after.edges[0],
      fields: ["to", "label", "kind", "directed", "metadata"],
    },
  ]);
  assert.deepEqual(diff.groups.changed, [
    {
      id: "checkout_runtime",
      before: before.groups[0],
      after: after.groups[0],
      fields: ["label", "contains", "metadata"],
    },
  ]);
});
