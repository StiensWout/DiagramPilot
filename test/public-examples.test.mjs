import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadValidatedDiagramSpec } from "../packages/core/dist/index.js";
import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

const discoveryFriendlyExamples = [
  {
    path: "examples/codebase-architecture/codebase-architecture.dp.yaml",
    title: /Codebase Architecture/u,
  },
  {
    path: "examples/dependency-map/dependency-map.dp.yaml",
    title: /Dependency Map/u,
  },
  {
    path: "examples/service-boundary-map/service-boundary-map.dp.yaml",
    title: /Service Boundary Map/u,
  },
  {
    path: "examples/monorepo-overview/monorepo-overview.dp.yaml",
    title: /Monorepo Overview/u,
  },
  {
    path:
      "examples/pull-request-architecture-review/pull-request-architecture-review.dp.yaml",
    title: /Pull Request Architecture Review/u,
  },
  {
    path: "examples/system-context/system-context.dp.yaml",
    title: /System Context/u,
  },
];

function loadRequiredExampleSpec(repoPath) {
  const result = loadValidatedDiagramSpec(path.join(repoRoot, repoPath));

  assert.equal(result.ok, true, repoPath);

  return result.spec;
}

function edgesOf(spec) {
  return spec.edges ?? [];
}

function groupsOf(spec) {
  return spec.groups ?? [];
}

function hasLabelAndKind(edge) {
  return typeof edge.label === "string" && typeof edge.kind === "string";
}

function metadataRecordsOf(spec) {
  return [
    spec.metadata,
    ...spec.nodes.map((node) => node.metadata),
    ...groupsOf(spec).map((group) => group.metadata),
    ...edgesOf(spec).map((edge) => edge.metadata),
  ].filter(Boolean);
}

function hasSourceReference(metadata) {
  return typeof metadata.source === "string";
}

test("public examples include at least five valid search-friendly DiagramPilot Source Files", () => {
  assert.equal(discoveryFriendlyExamples.length >= 5, true);

  for (const example of discoveryFriendlyExamples) {
    const spec = loadRequiredExampleSpec(example.path);

    assert.match(spec.title, example.title);
    assert.equal(spec.nodes.length >= 3, true, example.path);
  }
});

test("monorepo overview example demonstrates medium-complexity DiagramSpec semantics", () => {
  const spec = loadRequiredExampleSpec(
    "examples/monorepo-overview/monorepo-overview.dp.yaml",
  );

  assert.equal(spec.nodes.length >= 8, true);
  assert.equal(groupsOf(spec).length >= 3, true);
  assert.equal(edgesOf(spec).length >= 6, true);
  assert.equal(edgesOf(spec).every(hasLabelAndKind), true);
  assert.equal(metadataRecordsOf(spec).every(hasSourceReference), true);
});

test("public examples guide documents example commands and broken repair diagnostics", async () => {
  const examplesGuide = await readFile(
    path.join(repoRoot, "docs-public", "agents", "examples.md"),
    "utf8",
  );

  for (const example of discoveryFriendlyExamples) {
    const sourcePath = example.path;
    const svgPath = sourcePath.replace(/\.dp\.yaml$/u, ".svg");

    assertMatchesAll(examplesGuide, [
      new RegExp(sourcePath.replaceAll("/", "\\/"), "u"),
      new RegExp(`diagrampilot validate ${sourcePath.replaceAll("/", "\\/")}`, "u"),
      new RegExp(
        `diagrampilot render ${sourcePath.replaceAll("/", "\\/")} --out ${svgPath.replaceAll("/", "\\/")}`,
        "u",
      ),
      new RegExp(
        `diagrampilot export ${sourcePath.replaceAll("/", "\\/")} --format mermaid`,
        "u",
      ),
      new RegExp(`diagrampilot check ${path.dirname(sourcePath).replaceAll("/", "\\/")}`, "u"),
    ]);
  }

  assertMatchesAll(examplesGuide, [
    /Intentionally Broken Repair Example/u,
    /diagrampilot validate docs\/broken-architecture\.dp\.yaml/u,
    /edges\[0\]\.to/u,
    /missing_service/u,
    /change edges\[0\]\.to to an existing node ID/u,
  ]);
});

test("public docs document the maintained Source Creation template names", async () => {
  const publicTemplateDocs = [
    "README.md",
    "llms.txt",
    "docs-public/index.md",
    "docs-public/agents/examples.md",
    "docs-public/agents/quickstart.md",
    "docs-public/agents/installation.md",
    "packages/cli/README.md",
  ];

  for (const repoPath of publicTemplateDocs) {
    const source = await readFile(path.join(repoRoot, repoPath), "utf8");

    assertMatchesAll(source, [
      /architecture/u,
      /flow/u,
      /package-map/u,
      /system-context/u,
      /service-map/u,
    ]);
  }
});
