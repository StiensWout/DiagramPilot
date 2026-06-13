import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  createPlanningDependencies,
  testRenderer,
  validLoadResult,
} from "./cli-command-planning-helpers.mjs";

function inspectResult(options = {}) {
  const {
    scope = { kind: "directory", path: "docs" },
    artifactStatus = "missing-artifact",
  } = options;

  return {
    ok: true,
    scope,
    summary: {
      discoveredSourceCount: 1,
      validSourceCount: 1,
      invalidSourceCount: 0,
      artifactExpectationCount: 1,
      artifactIssueCount: artifactStatus === "fresh" ? 0 : 1,
    },
    sources: [
      {
        sourcePath: "docs/architecture.dp.yaml",
        validation: {
          ok: true,
          errors: [],
        },
        diagram: {
          title: "Checkout Architecture",
          direction: "right",
          counts: {
            nodes: 2,
            edges: 1,
            groups: 1,
          },
          stableIds: {
            nodes: ["web_app", "api_gateway"],
            edges: ["web_app_to_api_gateway"],
            groups: ["frontend"],
          },
          topology: {
            rootNodeIds: ["api_gateway"],
            rootGroupIds: ["frontend"],
            maxDepth: 1,
            containmentReferenceCount: 1,
          },
          views: [
            {
              id: "frontend_only",
              label: "Frontend Only",
              description: null,
              filters: {
                groups: ["frontend"],
                nodes: [],
                edges: [],
                nodeKinds: [],
                edgeKinds: [],
              },
              counts: {
                nodes: 1,
                edges: 0,
                groups: 1,
              },
            },
          ],
          layoutHints: [
            {
              id: "checkout_flow",
              kind: "primary_flow",
              nodes: ["web_app", "api_gateway"],
            },
            {
              id: "runtime_peers",
              kind: "same_layer",
              nodes: ["web_app", "api_gateway"],
            },
          ],
        },
        artifacts: [
          {
            format: "svg",
            status: artifactStatus,
            path: "docs/architecture.svg",
          },
        ],
      },
    ],
  };
}

function invalidInspectResult() {
  return {
    ok: true,
    scope: { kind: "directory", path: "docs" },
    summary: {
      discoveredSourceCount: 1,
      validSourceCount: 0,
      invalidSourceCount: 1,
      artifactExpectationCount: 0,
      artifactIssueCount: 0,
    },
    sources: [
      {
        sourcePath: "docs/invalid.dp.yaml",
        validation: {
          ok: false,
          errors: [
            {
              path: "title",
              message: "Missing required top-level field: title.",
              expected: "Required top-level fields: version, title, nodes.",
              suggestion: "Add a title field.",
            },
          ],
        },
        artifacts: [],
      },
    ],
  };
}

test("plans inspect by delegating Repo Workflow Inspect to the command adapter", async () => {
  let receivedOptions;

  const plan = await planCommand(
    ["inspect", "docs"],
    createPlanningDependencies({
      inspectDiagramPilotRepoWorkflow: async (options) => {
        receivedOptions = options;

        return inspectResult();
      },
      exportDiagramSpecToMermaid: (_spec, options) =>
        `profile:${options?.profile ?? "clean"}\n`,
    }),
  );

  assert.equal(receivedOptions.scopePath, "docs");
  assert.deepEqual(receivedOptions.renderer, testRenderer);
  assert.equal(receivedOptions.diagramPilotVersion, "0.1.0");
  assert.equal(typeof receivedOptions.exportConfiguredTextArtifact, "function");
  assert.equal(
    receivedOptions.exportConfiguredTextArtifact({
      format: "mermaid",
      profile: "compact",
      spec: validLoadResult().spec,
    }),
    "profile:compact\n",
  );
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: [
      "Found 1 DiagramPilot Source File in docs. 1 artifact issue.",
      "docs/architecture.dp.yaml",
      "  title: Checkout Architecture",
      "  direction: right",
      "  objects: 2 nodes, 1 edge, 1 group",
      "  Stable IDs: nodes=web_app, api_gateway; edges=web_app_to_api_gateway; groups=frontend",
      "  topology: root nodes=api_gateway; root groups=frontend; max depth=1; contains=1",
      "  views: frontend_only (1 node, 0 edges, 1 group)",
      "  layout hints: checkout_flow primary_flow (2 nodes); runtime_peers same_layer (2 nodes)",
      "  artifacts: svg docs/architecture.svg missing-artifact",
      "",
    ].join("\n"),
    stderr: "",
    writes: [],
  });
});

test("plans inspect text for invalid sources as diagnostic inventory", async () => {
  const plan = await planCommand(
    ["inspect", "docs"],
    createPlanningDependencies({
      inspectDiagramPilotRepoWorkflow: async () => invalidInspectResult(),
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: [
      "Found 1 DiagramPilot Source File in docs. 1 invalid source.",
      "docs/invalid.dp.yaml",
      "  invalid: 1 diagnostic",
      "  diagnostics:",
      "    - title: Missing required top-level field: title. Suggestion: Add a title field.",
      "",
    ].join("\n"),
    stderr: "",
    writes: [],
  });
});

test("plans inspect json as stable inventory for agents", async () => {
  const plan = await planCommand(
    ["inspect", "docs", "--json"],
    createPlanningDependencies({
      inspectDiagramPilotRepoWorkflow: async () => inspectResult(),
    }),
  );
  const payload = JSON.parse(plan.stdout);

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.summary, {
    discoveredSourceCount: 1,
    validSourceCount: 1,
    invalidSourceCount: 0,
    artifactExpectationCount: 1,
    artifactIssueCount: 1,
  });
  assert.deepEqual(payload.sources[0].diagram.stableIds, {
    nodes: ["web_app", "api_gateway"],
    edges: ["web_app_to_api_gateway"],
    groups: ["frontend"],
  });
  assert.equal(payload.sources[0].diagram.views.length, 1);
  assert.equal(payload.sources[0].diagram.views[0].id, "frontend_only");
  assert.equal(payload.sources[0].diagram.views[0].label, "Frontend Only");
  assert.equal(payload.sources[0].diagram.views[0].description, null);
  assert.deepEqual(payload.sources[0].diagram.views[0].filters.groups, [
    "frontend",
  ]);
  assert.deepEqual(payload.sources[0].diagram.views[0].filters.nodes, []);
  assert.deepEqual(payload.sources[0].diagram.views[0].filters.edges, []);
  assert.deepEqual(payload.sources[0].diagram.views[0].filters.nodeKinds, []);
  assert.deepEqual(payload.sources[0].diagram.views[0].filters.edgeKinds, []);
  assert.deepEqual(payload.sources[0].diagram.views[0].counts, {
    nodes: 1,
    edges: 0,
    groups: 1,
  });
  assert.deepEqual(payload.sources[0].diagram.layoutHints, [
    {
      id: "checkout_flow",
      kind: "primary_flow",
      nodes: ["web_app", "api_gateway"],
    },
    {
      id: "runtime_peers",
      kind: "same_layer",
      nodes: ["web_app", "api_gateway"],
    },
  ]);
  assert.deepEqual(payload.sources[0].artifacts, [
    {
      format: "svg",
      status: "missing-artifact",
      path: "docs/architecture.svg",
    },
  ]);
});
