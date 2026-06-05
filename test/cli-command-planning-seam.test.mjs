import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/command-planning.js";

test("command planning remains testable through a focused module", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.yaml"],
    {
      loadValidatedDiagramSpec: () => ({
        ok: true,
        source: {
          format: "yaml",
          path: "docs/architecture.dp.yaml",
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
      }),
      checkDiagramPilotRepoWorkflow: async () => {
        throw new Error("validate planning should not run repo workflow check");
      },
      exportDiagramSpecToMermaid: () => {
        throw new Error("validate planning should not export Mermaid");
      },
      exportDiagramSpecToD2: () => {
        throw new Error("validate planning should not export D2");
      },
      readSourceContent: () => {
        throw new Error("validate planning should not read source content");
      },
      renderDiagramSpecToSvg: async () => {
        throw new Error("validate planning should not render SVG");
      },
      createSvgRendererProvenance: () => {
        throw new Error("validate planning should not create render provenance");
      },
      getDiagramPilotVersion: () => "0.1.0",
    },
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "Valid docs/architecture.dp.yaml\n",
    stderr: "",
    writes: [],
  });
});
