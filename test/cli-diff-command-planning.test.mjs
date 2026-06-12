import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  assertStderrFailurePlan,
  createPlanningDependencies,
  readFailure,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";

function beforeLoadResult() {
  const result = validLoadResult("before.dp.yaml");
  result.spec = {
    version: 1,
    title: "Checkout",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      { id: "web_app_to_api_gateway", from: "web_app", to: "api_gateway" },
    ],
    groups: [
      {
        id: "runtime",
        label: "Runtime",
        contains: ["web_app", "api_gateway"],
      },
    ],
  };
  return result;
}

function afterLoadResult() {
  const result = validLoadResult("after.dp.yaml");
  result.spec = {
    version: 1,
    title: "Checkout",
    nodes: [
      { id: "web_app", label: "Web Frontend" },
      { id: "orders_service", label: "Orders Service" },
    ],
    edges: [
      { id: "web_app_to_orders_service", from: "web_app", to: "orders_service" },
    ],
    groups: [
      {
        id: "runtime",
        label: "Runtime",
        contains: ["web_app", "orders_service"],
      },
    ],
  };
  return result;
}

test("plans diff JSON output without writing or mutating sources", async () => {
  const loads = new Map([
    ["before.dp.yaml", beforeLoadResult()],
    ["after.dp.yaml", afterLoadResult()],
  ]);
  const beforeSnapshot = JSON.stringify(loads.get("before.dp.yaml").spec);
  const afterSnapshot = JSON.stringify(loads.get("after.dp.yaml").spec);

  const plan = await planCommand(
    ["diff", "before.dp.yaml", "after.dp.yaml", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: (path) => loads.get(path),
    }),
  );

  assert.equal(JSON.stringify(loads.get("before.dp.yaml").spec), beforeSnapshot);
  assert.equal(JSON.stringify(loads.get("after.dp.yaml").spec), afterSnapshot);
  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const result = JSON.parse(plan.stdout);
  assert.equal(result.beforePath, "before.dp.yaml");
  assert.equal(result.afterPath, "after.dp.yaml");
  assert.deepEqual(result.diff.summary, {
    added: { nodes: 1, edges: 1, groups: 0 },
    removed: { nodes: 1, edges: 1, groups: 0 },
    changed: { nodes: 1, edges: 0, groups: 1 },
  });
  assert.deepEqual(result.diff.nodes.changed[0].fields, ["label"]);
  assert.deepEqual(result.diff.groups.changed[0].fields, ["contains"]);
});

test("plans diff SVG output by rendering a generated diff DiagramSpec", async () => {
  const loads = new Map([
    ["before.dp.yaml", beforeLoadResult()],
    ["after.dp.yaml", afterLoadResult()],
  ]);
  let renderedSpec;

  const plan = await planCommand(
    ["diff", "before.dp.yaml", "after.dp.yaml", "--out", "review/diff.svg"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: (path) => loads.get(path),
      renderDiagramSpecToSvg: async (spec) => {
        renderedSpec = spec;
        return "<svg><title>DiagramPilot Diff</title></svg>";
      },
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stdout, "");
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, [
    {
      path: "review/diff.svg",
      content: "<svg><title>DiagramPilot Diff</title></svg>",
    },
  ]);
  assert.equal(renderedSpec.title, "DiagramPilot Diff: before.dp.yaml -> after.dp.yaml");
  assert.deepEqual(
    renderedSpec.nodes.map((node) => [node.id, node.label]),
    [
      ["added_node_orders_service", "+ node orders_service"],
      ["removed_node_api_gateway", "- node api_gateway"],
      ["changed_node_web_app", "~ node web_app: label"],
      ["added_edge_web_app_to_orders_service", "+ edge web_app_to_orders_service"],
      ["removed_edge_web_app_to_api_gateway", "- edge web_app_to_api_gateway"],
      ["changed_group_runtime", "~ group runtime: contains"],
    ],
  );
  assert.deepEqual(renderedSpec.groups, [
    {
      id: "diff_added",
      label: "Added",
      contains: ["added_node_orders_service", "added_edge_web_app_to_orders_service"],
    },
    {
      id: "diff_removed",
      label: "Removed",
      contains: ["removed_node_api_gateway", "removed_edge_web_app_to_api_gateway"],
    },
    {
      id: "diff_changed",
      label: "Changed",
      contains: ["changed_node_web_app", "changed_group_runtime"],
    },
  ]);
});

test("plans diff input failures as repairable diagnostics without rendering or writing", async () => {
  let renderCalled = false;

  const plan = await planCommand(
    ["diff", "missing.dp.yaml", "after.dp.yaml", "--out", "review/diff.svg"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: (path) =>
        path === "missing.dp.yaml" ? readFailure(path) : afterLoadResult(),
      renderDiagramSpecToSvg: async () => {
        renderCalled = true;
        return "<svg></svg>";
      },
    }),
  );

  assert.equal(renderCalled, false);
  assertStderrFailurePlan(plan, [
    /Unable to read missing\.dp\.yaml: ENOENT: no such file or directory/,
  ]);
});
