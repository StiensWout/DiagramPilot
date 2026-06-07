import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";

function createPlanningDependencies(overrides = {}) {
  return {
    loadValidatedDiagramSpec: () => {
      throw new Error("check planning should not load sources directly");
    },
    checkDiagramPilotRepoWorkflow: async () => ({
      ok: true,
      scope: { kind: "directory", path: "/repo" },
      summary: {
        checkedSourceCount: 0,
        freshSourceCount: 0,
        issueCount: 0,
      },
      sources: [],
    }),
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
    ...overrides,
  };
}

test("plans check text artifact evidence failures with render repair commands", async () => {
  const plan = await planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 3,
          freshSourceCount: 0,
          issueCount: 3,
        },
        sources: [
          {
            sourcePath: "docs/missing_provenance.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "missing-provenance",
              path: "docs/missing_provenance.svg",
            },
          },
          {
            sourcePath: "docs/unreadable.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "unreadable-artifact",
              path: "docs/unreadable.svg",
              message: "EACCES",
            },
          },
          {
            sourcePath: "docs/malformed.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "malformed-artifact",
              path: "docs/malformed.svg",
              message: "Malformed DiagramPilot provenance",
            },
          },
        ],
      }),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.match(
    plan.stderr,
    /Missing DiagramPilot provenance: docs\/missing_provenance\.svg for docs\/missing_provenance\.dp\.yaml\. Run `diagrampilot render docs\/missing_provenance\.dp\.yaml --out docs\/missing_provenance\.svg`\./,
  );
  assert.match(
    plan.stderr,
    /Unreadable SVG artifact: docs\/unreadable\.svg for docs\/unreadable\.dp\.yaml\. Run `diagrampilot render docs\/unreadable\.dp\.yaml --out docs\/unreadable\.svg`\./,
  );
  assert.match(
    plan.stderr,
    /Malformed SVG artifact: docs\/malformed\.svg for docs\/malformed\.dp\.yaml\. Run `diagrampilot render docs\/malformed\.dp\.yaml --out docs\/malformed\.svg`\./,
  );
  assert.doesNotMatch(plan.stderr, /EACCES|Malformed DiagramPilot provenance/);
});

test("plans check text configured artifact failures with format-specific repair commands", async () => {
  const plan = await planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 1,
          freshSourceCount: 0,
          issueCount: 1,
        },
        sources: [
          {
            sourcePath: "docs/architecture.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              format: "mermaid",
              status: "fresh",
              path: "docs/architecture.mmd",
              freshness: "content",
            },
            artifacts: [
              {
                format: "mermaid",
                status: "fresh",
                path: "docs/architecture.mmd",
                freshness: "content",
              },
              {
                format: "d2",
                status: "stale",
                path: "docs/architecture.d2",
                reasons: ["content-mismatch"],
                expectedSha256: "new-hash",
                actualSha256: "old-hash",
              },
              {
                format: "png",
                status: "missing-artifact",
                path: "docs/architecture.png",
              },
            ],
          },
        ],
      }),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  assert.match(
    plan.stderr,
    /Stale D2 artifact: docs\/architecture\.d2 for docs\/architecture\.dp\.yaml \(content-mismatch\)\. Run `diagrampilot export docs\/architecture\.dp\.yaml --format d2 --out docs\/architecture\.d2`\./,
  );
  assert.match(
    plan.stderr,
    /Missing PNG artifact: docs\/architecture\.png for docs\/architecture\.dp\.yaml\. Run `diagrampilot render docs\/architecture\.dp\.yaml --format png --out docs\/architecture\.png`\./,
  );
  assert.doesNotMatch(plan.stderr, /old-hash|new-hash/);
});
