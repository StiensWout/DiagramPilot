import assert from "node:assert/strict";
import test from "node:test";

import {
  selectDiagramSpecView,
  validateDiagramSpec,
} from "../packages/core/dist/index.js";

function checkoutSpec() {
  return {
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
    views: [
      {
        id: "runtime",
        label: "Runtime",
        groups: ["checkout_runtime"],
        edgeKinds: ["request", "data_flow"],
      },
    ],
  };
}

test("selectDiagramSpecView returns a filtered valid DiagramSpec without mutating the source", () => {
  const spec = checkoutSpec();
  const beforeProjection = JSON.stringify(spec);

  const result = selectDiagramSpecView(spec, "runtime");

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(spec), beforeProjection);
  assert.deepEqual(
    result.spec.nodes.map((node) => node.id),
    ["api_gateway", "orders_service", "orders_db"],
  );
  assert.deepEqual(
    result.spec.groups.map((group) => ({
      id: group.id,
      contains: group.contains,
    })),
    [
      {
        id: "checkout_runtime",
        contains: ["api_gateway", "orders_service", "orders_db"],
      },
    ],
  );
  assert.deepEqual(
    result.spec.edges.map((edge) => edge.id),
    ["api_gateway_to_orders_service", "orders_service_to_orders_db"],
  );
  assert.deepEqual(result.spec.views, spec.views);
  assert.deepEqual(result.counts, {
    nodes: 3,
    edges: 2,
    groups: 1,
  });
  assert.deepEqual(validateDiagramSpec(result.spec), { ok: true, errors: [] });
});
