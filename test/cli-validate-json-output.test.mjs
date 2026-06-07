import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";

function validLoadResult(sourcePath = "docs/architecture.dp.yaml") {
  return {
    ok: true,
    source: {
      format: "yaml",
      path: sourcePath,
      content: "version: 1\n",
      value: {
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
    },
    spec: {
      version: 1,
      title: "Checkout Architecture",
      nodes: [{ id: "web_app", label: "Web App" }],
    },
  };
}

function unsupportedSourceFormatFailure(path = "docs/architecture.dp.json") {
  return {
    ok: false,
    failure: {
      kind: "unsupported-source-format",
      path,
      message: `Unsupported DiagramPilot source file: ${path}. YAML is the supported source format; use a *.dp.yaml source file.`,
    },
  };
}

function createPlanningDependencies(loadValidatedDiagramSpec) {
  return {
    loadValidatedDiagramSpec,
    checkDiagramPilotRepoWorkflow: async () => {
      throw new Error("validate planning should not run repo workflow check");
    },
    exportDiagramSpecToMermaid: () => "flowchart LR\n",
    exportDiagramSpecToD2: () => "direction: right\n",
    exportDiagramSpecToDot: () => "digraph checkout_architecture {\n}\n",
    readSourceContent: () => "version: 1\n",
    renderDiagramSpecToSvg: async () => "<svg></svg>",
    rasterizeSvgToPng: () => Buffer.from([]),
    createSvgRendererProvenance: () => ({
      sourcePath: "docs/architecture.dp.yaml",
      sourceSha256: "hash",
      diagramPilotVersion: "0.1.0",
      renderer: { name: "@terrastruct/d2", version: "0.1.33" },
    }),
    getDiagramPilotVersion: () => "0.1.0",
  };
}

test("validate --json emits structured success output for YAML sources", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.yaml", "--json"],
    createPlanningDependencies(() => validLoadResult()),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);
  assert.deepEqual(JSON.parse(plan.stdout), {
    file: "docs/architecture.dp.yaml",
    ok: true,
    errors: [],
  });
});

test("validate --json emits structured repair hints for legacy JSON sources", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.json", "--json"],
    createPlanningDependencies(() => unsupportedSourceFormatFailure()),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const result = JSON.parse(plan.stdout);

  assert.equal(result.file, "docs/architecture.dp.json");
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    {
      path: "$",
      message:
        "Unsupported DiagramPilot source file: docs/architecture.dp.json. YAML is the supported source format; use a *.dp.yaml source file.",
      expected: "YAML DiagramPilot Source File syntax.",
      suggestion: "Use a `*.dp.yaml` DiagramPilot Source File.",
    },
  ]);
});
