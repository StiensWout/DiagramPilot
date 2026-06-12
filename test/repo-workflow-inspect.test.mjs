import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  inspectDiagramPilotRepoWorkflow,
} from "../packages/core/dist/index.js";
import {
  repoWorkflowCheckOptions,
  withTempRepo,
} from "./repo-workflow-check-helpers.mjs";

const groupedSourceContent = [
  "version: 1",
  "title: Checkout Architecture",
  "direction: right",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "  - id: api_gateway",
  "    label: API Gateway",
  "groups:",
  "  - id: frontend",
  "    label: Frontend",
  "    contains:",
  "      - web_app",
  "views:",
  "  - id: frontend_only",
  "    label: Frontend Only",
  "    groups:",
  "      - frontend",
  "edges:",
  "  - id: web_app_to_api_gateway",
  "    from: web_app",
  "    to: api_gateway",
  "",
].join("\n");

async function writeGroupedSource(tempRoot) {
  const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, groupedSourceContent, "utf8");
  return sourcePath;
}

async function writeInvalidSource(tempRoot) {
  const sourcePath = path.join(tempRoot, "docs", "invalid.dp.yaml");
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(
    sourcePath,
    [
      "version: 1",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n"),
    "utf8",
  );
  return sourcePath;
}

test("inspectDiagramPilotRepoWorkflow reports source inventory, topology, Stable IDs, and artifact expectations", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeGroupedSource(tempRoot);

    const result = await inspectDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      discoveredSourceCount: 1,
      validSourceCount: 1,
      invalidSourceCount: 0,
      artifactExpectationCount: 1,
      artifactIssueCount: 1,
    });
    assert.equal(result.sources.length, 1);
    const [source] = result.sources;

    assert.equal(source.sourcePath, "docs/architecture.dp.yaml");
    assert.deepEqual(source.validation, { ok: true, errors: [] });
    assert.equal(source.diagram.title, "Checkout Architecture");
    assert.equal(source.diagram.direction, "right");
    assert.deepEqual(source.diagram.counts, {
      nodes: 2,
      edges: 1,
      groups: 1,
    });
    assert.deepEqual(source.diagram.stableIds.nodes, [
      "web_app",
      "api_gateway",
    ]);
    assert.deepEqual(source.diagram.stableIds.edges, [
      "web_app_to_api_gateway",
    ]);
    assert.deepEqual(source.diagram.stableIds.groups, ["frontend"]);
    assert.deepEqual(source.diagram.topology, {
      rootNodeIds: ["api_gateway"],
      rootGroupIds: ["frontend"],
      maxDepth: 1,
      containmentReferenceCount: 1,
    });
    assert.deepEqual(source.diagram.views, [
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
    ]);
    assert.deepEqual(source.artifacts, [
      {
        format: "svg",
        status: "missing-artifact",
        path: "docs/architecture.svg",
      },
    ]);
  });
});

test("inspectDiagramPilotRepoWorkflow keeps invalid sources in diagnostic inventory", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeInvalidSource(tempRoot);

    const result = await inspectDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      discoveredSourceCount: 1,
      validSourceCount: 0,
      invalidSourceCount: 1,
      artifactExpectationCount: 0,
      artifactIssueCount: 0,
    });
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0].sourcePath, "docs/invalid.dp.yaml");
    assert.equal(result.sources[0].validation.ok, false);
    assert.equal(result.sources[0].validation.errors[0].path, "title");
    assert.equal(result.sources[0].diagram, undefined);
    assert.deepEqual(result.sources[0].artifacts, []);
  });
});
