import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  createPlanningDependencies,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";

function validViewLoadResult() {
  const loaded = validLoadResult();
  loaded.spec = {
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_service", label: "Orders Service" },
    ],
    groups: [
      {
        id: "runtime",
        label: "Runtime",
        contains: ["api_gateway", "orders_service"],
      },
    ],
    edges: [
      {
        id: "api_gateway_to_orders_service",
        from: "api_gateway",
        to: "orders_service",
      },
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
      },
    ],
    views: [{ id: "runtime", groups: ["runtime"] }],
  };

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

test("plans render with a view by rendering the projected DiagramSpec", async () => {
  let renderedSpec;

  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--view",
      "runtime",
      "--out",
      "docs/architecture-runtime.svg",
    ],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validViewLoadResult(),
      renderDiagramSpecToSvg: async (spec) => {
        renderedSpec = spec;
        return "<svg><title>Runtime</title></svg>";
      },
    }),
  );

  assert.deepEqual(
    renderedSpec.nodes.map((node) => node.id),
    ["api_gateway", "orders_service"],
  );
  assert.deepEqual(
    renderedSpec.edges.map((edge) => edge.id),
    ["api_gateway_to_orders_service"],
  );
  assertSingleWritePlan(plan, {
    path: "docs/architecture-runtime.svg",
    content: "<svg><title>Runtime</title></svg>",
  });
});

test("plans export with a view by exporting the projected DiagramSpec for text formats", async () => {
  const exportedNodeIdsByFormat = new Map();
  const exporters = {
    exportDiagramSpecToMermaid: (spec) => {
      exportedNodeIdsByFormat.set(
        "mermaid",
        spec.nodes.map((node) => node.id),
      );
      return "flowchart LR\n";
    },
    exportDiagramSpecToD2: (spec) => {
      exportedNodeIdsByFormat.set(
        "d2",
        spec.nodes.map((node) => node.id),
      );
      return "direction: right\n";
    },
    exportDiagramSpecToDot: (spec) => {
      exportedNodeIdsByFormat.set(
        "dot",
        spec.nodes.map((node) => node.id),
      );
      return "digraph checkout_architecture {\n}\n";
    },
  };

  for (const format of ["mermaid", "d2", "dot"]) {
    const plan = await planCommand(
      [
        "export",
        "docs/architecture.dp.yaml",
        "--view",
        "runtime",
        "--format",
        format,
      ],
      createPlanningDependencies({
        loadValidatedDiagramSpec: () => validViewLoadResult(),
        ...exporters,
      }),
    );

    assert.equal(plan.exitCode, 0);
    assert.equal(plan.stderr, "");
    assert.deepEqual(plan.writes, []);
  }

  assert.deepEqual(Array.from(exportedNodeIdsByFormat.entries()), [
    ["mermaid", ["api_gateway", "orders_service"]],
    ["d2", ["api_gateway", "orders_service"]],
    ["dot", ["api_gateway", "orders_service"]],
  ]);
});
