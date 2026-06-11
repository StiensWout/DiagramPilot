import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { createRepoWorkflowArtifactPlan } from "../packages/core/dist/index.js";

const spec = {
  version: 1,
  title: "Architecture",
  nodes: [{ id: "api", label: "API" }],
};

function sourceFile(sourcePath) {
  return {
    format: "yaml",
    path: sourcePath,
    value: spec,
    content: "",
  };
}

function plannedOutputSummaries(plan) {
  return plan.outputs.map(({ output, absolutePath, displayPath }) => ({
    format: output.format,
    absolutePath,
    displayPath,
  }));
}

test("Repo Workflow Artifact plan creates default SVG output next to source", () => {
  const repoRoot = path.resolve("/tmp/diagrampilot-plan");
  const sourceAbsolutePath = path.join(repoRoot, "docs", "architecture.dp.yaml");

  const plan = createRepoWorkflowArtifactPlan({
    currentWorkingDirectory: repoRoot,
    source: {
      sourcePath: "docs/architecture.dp.yaml",
      sourceAbsolutePath,
      source: sourceFile("docs/architecture.dp.yaml"),
      spec,
      outputs: [],
    },
  });

  assert.deepEqual(
    plannedOutputSummaries(plan),
    [
      {
        format: "svg",
        absolutePath: path.join(repoRoot, "docs", "architecture.svg"),
        displayPath: "docs/architecture.svg",
      },
    ],
  );
  assert.deepEqual(plan.markdownReferences, []);
});

test("Repo Workflow Artifact plan resolves configured outputs in write order", () => {
  const repoRoot = path.resolve("/tmp/diagrampilot-plan");
  const sourceAbsolutePath = path.join(repoRoot, "docs", "architecture.dp.yaml");
  const config = {
    path: path.join(repoRoot, "diagrampilot.config.yaml"),
    directory: repoRoot,
    version: 1,
    sources: { ignore: [] },
    artifacts: [],
  };

  const plan = createRepoWorkflowArtifactPlan({
    config,
    currentWorkingDirectory: repoRoot,
    source: {
      sourcePath: "docs/architecture.dp.yaml",
      sourceAbsolutePath,
      source: sourceFile("docs/architecture.dp.yaml"),
      spec,
      outputs: [
        { format: "markdown", path: "generated/embeds/{stem}.md" },
        { format: "svg", path: "generated/svg/{stem}.svg" },
        { format: "mermaid", path: "generated/text/{stem}.mmd" },
      ],
    },
  });

  assert.deepEqual(
    plannedOutputSummaries(plan),
    [
      {
        format: "svg",
        absolutePath: path.join(repoRoot, "generated", "svg", "architecture.svg"),
        displayPath: "generated/svg/architecture.svg",
      },
      {
        format: "mermaid",
        absolutePath: path.join(
          repoRoot,
          "generated",
          "text",
          "architecture.mmd",
        ),
        displayPath: "generated/text/architecture.mmd",
      },
      {
        format: "markdown",
        absolutePath: path.join(
          repoRoot,
          "generated",
          "embeds",
          "architecture.md",
        ),
        displayPath: "generated/embeds/architecture.md",
      },
    ],
  );
  assert.deepEqual(
    plan.markdownReferences.map(({ format, path: artifactPath }) => ({
      format,
      artifactPath,
    })),
    [
      {
        format: "svg",
        artifactPath: path.join(repoRoot, "generated", "svg", "architecture.svg"),
      },
      {
        format: "mermaid",
        artifactPath: path.join(
          repoRoot,
          "generated",
          "text",
          "architecture.mmd",
        ),
      },
    ],
  );
});
