import assert from "node:assert/strict";
import test from "node:test";

import {
  selectFocusedDiagramSpec,
  validateDiagramSpec,
} from "../packages/core/dist/index.js";
import {
  assertProjectionResult,
  checkoutProjectionSpec,
  checkoutRuntimeProjectionExpectation,
} from "./diagramspec-projection-helpers.mjs";

test("selectFocusedDiagramSpec returns one group with local edges without mutating the source", () => {
  const spec = checkoutProjectionSpec();
  const beforeProjection = JSON.stringify(spec);

  const result = selectFocusedDiagramSpec(spec, {
    groupId: "checkout_runtime",
  });

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(spec), beforeProjection);
  assertProjectionResult(result, checkoutRuntimeProjectionExpectation());
  assert.deepEqual(validateDiagramSpec(result.spec), { ok: true, errors: [] });
});

test("selectFocusedDiagramSpec returns a node neighborhood at the requested depth", () => {
  const result = selectFocusedDiagramSpec(checkoutProjectionSpec(), {
    aroundNodeId: "orders_service",
    depth: 1,
  });

  assertProjectionResult(result, {
    nodes: ["api_gateway", "orders_service", "orders_db", "analytics_worker"],
    groups: [
      {
        id: "checkout_runtime",
        contains: ["api_gateway", "orders_service", "orders_db"],
      },
      {
        id: "analytics",
        contains: ["analytics_worker"],
      },
    ],
    edges: [
      "api_gateway_to_orders_service",
      "orders_service_to_orders_db",
      "orders_service_to_analytics_worker",
    ],
    counts: {
      nodes: 4,
      edges: 3,
      groups: 2,
    },
  });
});

test("selectFocusedDiagramSpec hides edge labels for overview output without mutating the source", () => {
  const spec = checkoutProjectionSpec();
  const beforeProjection = JSON.stringify(spec);

  const result = selectFocusedDiagramSpec(spec, {
    hideEdgeLabels: true,
  });

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(spec), beforeProjection);
  assert.equal(spec.edges[0].label, "HTTPS");
  assert.deepEqual(
    result.spec.edges.map((edge) => ({ id: edge.id, label: edge.label })),
    [
      { id: "web_app_to_api_gateway", label: undefined },
      { id: "api_gateway_to_orders_service", label: undefined },
      { id: "orders_service_to_orders_db", label: undefined },
      { id: "orders_service_to_analytics_worker", label: undefined },
    ],
  );
  assert.deepEqual(result.counts, {
    nodes: 5,
    edges: 4,
    groups: 2,
  });
});

test("selectFocusedDiagramSpec reports unknown focus IDs as repairable diagnostics", () => {
  const result = selectFocusedDiagramSpec(checkoutProjectionSpec(), {
    groupId: "missing_group",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.error, {
    path: "groups",
    message: 'Unknown DiagramSpec group "missing_group".',
    badValue: "missing_group",
    expected: "One of: checkout_runtime, analytics.",
    suggestion: "Choose a group ID declared in the DiagramSpec groups collection.",
  });
});
