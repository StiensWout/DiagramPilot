import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  assertStderrFailurePlan,
  createPlanningDependencies,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";
import {
  checkoutProjectionSpec,
  objectIds,
} from "./diagramspec-projection-helpers.mjs";

function validFocusLoadResult() {
  const loaded = validLoadResult();
  loaded.spec = checkoutProjectionSpec();

  return loaded;
}

function validViewFocusLoadResult() {
  const loaded = validFocusLoadResult();
  loaded.spec = checkoutProjectionSpec({ withRuntimeView: true });

  return loaded;
}

function assertSingleWritePlan(plan, write) {
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [write],
  });
}

async function planFocusedRender(args, options) {
  let renderedSpec;
  const plan = await planCommand(
    args,
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => options.loadResult,
      renderDiagramSpecToSvg: async (spec) => {
        renderedSpec = spec;
        return `<svg><title>${options.svgTitle}</title></svg>`;
      },
    }),
  );

  return { plan, renderedSpec };
}

function assertRenderedObjectIds(renderedSpec, expected) {
  assert.deepEqual(objectIds(renderedSpec.nodes), expected.nodes);
  assert.deepEqual(objectIds(renderedSpec.edges), expected.edges);
}

test("plans render with a group focus by rendering the projected DiagramSpec", async () => {
  const { plan, renderedSpec } = await planFocusedRender(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--group",
      "checkout_runtime",
      "--out",
      "docs/checkout-runtime.svg",
    ],
    {
      loadResult: validFocusLoadResult(),
      svgTitle: "Checkout Runtime",
    },
  );

  assertRenderedObjectIds(renderedSpec, {
    nodes: ["api_gateway", "orders_service", "orders_db"],
    edges: ["api_gateway_to_orders_service", "orders_service_to_orders_db"],
  });
  assertSingleWritePlan(plan, {
    path: "docs/checkout-runtime.svg",
    content: "<svg><title>Checkout Runtime</title></svg>",
  });
});

test("plans render around a node by rendering the requested neighborhood depth", async () => {
  const { plan, renderedSpec } = await planFocusedRender(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--around",
      "orders_service",
      "--depth",
      "1",
      "--out",
      "docs/orders-service-neighborhood.svg",
    ],
    {
      loadResult: validFocusLoadResult(),
      svgTitle: "Orders Service Neighborhood",
    },
  );

  assertRenderedObjectIds(renderedSpec, {
    nodes: ["api_gateway", "orders_service", "orders_db", "analytics_worker"],
    edges: [
      "api_gateway_to_orders_service",
      "orders_service_to_orders_db",
      "orders_service_to_analytics_worker",
    ],
  });
  assertSingleWritePlan(plan, {
    path: "docs/orders-service-neighborhood.svg",
    content: "<svg><title>Orders Service Neighborhood</title></svg>",
  });
});

test("plans render focus after applying a selected view projection", async () => {
  const { plan, renderedSpec } = await planFocusedRender(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--view",
      "runtime",
      "--around",
      "orders_service",
      "--depth",
      "1",
      "--out",
      "docs/runtime-orders-service.svg",
    ],
    {
      loadResult: validViewFocusLoadResult(),
      svgTitle: "Runtime Orders Service",
    },
  );

  assertRenderedObjectIds(renderedSpec, {
    nodes: ["api_gateway", "orders_service", "orders_db"],
    edges: ["api_gateway_to_orders_service", "orders_service_to_orders_db"],
  });
  assertSingleWritePlan(plan, {
    path: "docs/runtime-orders-service.svg",
    content: "<svg><title>Runtime Orders Service</title></svg>",
  });
});

test("plans render overview by hiding edge labels without mutating the loaded source", async () => {
  const loaded = validFocusLoadResult();
  const beforeRender = JSON.stringify(loaded.spec);
  let renderedSpec;

  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--hide-edge-labels",
      "--out",
      "docs/architecture-overview.svg",
    ],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => loaded,
      renderDiagramSpecToSvg: async (spec) => {
        renderedSpec = spec;
        return "<svg><title>Architecture Overview</title></svg>";
      },
    }),
  );

  assert.equal(JSON.stringify(loaded.spec), beforeRender);
  assert.deepEqual(
    renderedSpec.edges.map((edge) => ({ id: edge.id, label: edge.label })),
    [
      { id: "web_app_to_api_gateway", label: undefined },
      { id: "api_gateway_to_orders_service", label: undefined },
      { id: "orders_service_to_orders_db", label: undefined },
      { id: "orders_service_to_analytics_worker", label: undefined },
    ],
  );
  assertSingleWritePlan(plan, {
    path: "docs/architecture-overview.svg",
    content: "<svg><title>Architecture Overview</title></svg>",
  });
});

test("plans unknown focused render IDs as repairable diagnostics without rendering", async () => {
  let renderCalled = false;

  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--around",
      "missing_service",
      "--depth",
      "1",
      "--out",
      "docs/missing.svg",
    ],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validFocusLoadResult(),
      renderDiagramSpecToSvg: async () => {
        renderCalled = true;
        return "<svg></svg>";
      },
    }),
  );

  assert.equal(renderCalled, false);
  assertStderrFailurePlan(plan, [
    /DiagramSpec focus error in docs\/architecture\.dp\.yaml: Unknown DiagramSpec node "missing_service"\./,
    /Path: nodes/,
    /Expected: One of: web_app, api_gateway, orders_service, orders_db, analytics_worker\./,
    /Suggestion: Choose a node ID declared in the DiagramSpec nodes collection\./,
  ]);
});

test("plans invalid focused render option combinations as usage without loading the source", async () => {
  for (const args of [
    [
      "render",
      "docs/architecture.dp.yaml",
      "--group",
      "checkout_runtime",
      "--around",
      "orders_service",
      "--out",
      "docs/invalid.svg",
    ],
    [
      "render",
      "docs/architecture.dp.yaml",
      "--depth",
      "1",
      "--out",
      "docs/invalid.svg",
    ],
    [
      "render",
      "docs/architecture.dp.yaml",
      "--around",
      "orders_service",
      "--depth",
      "many",
      "--out",
      "docs/invalid.svg",
    ],
  ]) {
    const plan = await planCommand(
      args,
      createPlanningDependencies({
        loadValidatedDiagramSpec: () => {
          throw new Error("invalid usage should fail before source loading");
        },
      }),
    );

    assert.equal(plan.exitCode, 1);
    assert.equal(plan.stdout, "");
    assert.deepEqual(plan.writes, []);
    assert.match(plan.stderr, /^Choose either --group|^--depth requires|^Invalid render depth/);
  }
});
