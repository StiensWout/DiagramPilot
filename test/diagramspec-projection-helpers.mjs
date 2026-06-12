import assert from "node:assert/strict";

export function checkoutProjectionSpec(options = {}) {
  const { withRuntimeView = false } = options;
  const spec = {
    version: 1,
    title: "Checkout Architecture",
    direction: "right",
    nodes: [
      { id: "web_app", label: "Web App", kind: "frontend" },
      { id: "api_gateway", label: "API Gateway", kind: "service" },
      { id: "orders_service", label: "Orders Service", kind: "service" },
      { id: "orders_db", label: "Orders DB", kind: "database" },
      { id: "analytics_worker", label: "Analytics Worker", kind: "worker" },
    ],
    groups: [
      {
        id: "checkout_runtime",
        label: "Checkout Runtime",
        contains: ["api_gateway", "orders_service", "orders_db"],
      },
      {
        id: "analytics",
        label: "Analytics",
        contains: ["analytics_worker"],
      },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
        kind: "request",
      },
      {
        id: "api_gateway_to_orders_service",
        from: "api_gateway",
        to: "orders_service",
        label: "gRPC",
        kind: "request",
      },
      {
        id: "orders_service_to_orders_db",
        from: "orders_service",
        to: "orders_db",
        label: "SQL",
        kind: "data_flow",
      },
      {
        id: "orders_service_to_analytics_worker",
        from: "orders_service",
        to: "analytics_worker",
        label: "OrderCreated",
        kind: "event",
      },
    ],
  };

  if (withRuntimeView) {
    spec.views = [
      {
        id: "runtime",
        label: "Runtime",
        groups: ["checkout_runtime"],
        edgeKinds: ["request", "data_flow"],
      },
    ];
  }

  return spec;
}

export function checkoutRuntimeProjectionExpectation() {
  return {
    nodes: ["api_gateway", "orders_service", "orders_db"],
    groups: [
      {
        id: "checkout_runtime",
        contains: ["api_gateway", "orders_service", "orders_db"],
      },
    ],
    edges: ["api_gateway_to_orders_service", "orders_service_to_orders_db"],
    counts: {
      nodes: 3,
      edges: 2,
      groups: 1,
    },
  };
}

export function objectIds(objects) {
  return objects.map((object) => object.id);
}

function groupSummaries(groups) {
  return groups.map((group) => ({
    id: group.id,
    contains: group.contains,
  }));
}

export function assertProjectionResult(result, expected) {
  assert.equal(result.ok, true);
  assert.deepEqual(objectIds(result.spec.nodes), expected.nodes);
  assert.deepEqual(groupSummaries(result.spec.groups), expected.groups);
  assert.deepEqual(objectIds(result.spec.edges), expected.edges);
  assert.deepEqual(result.counts, expected.counts);
}
