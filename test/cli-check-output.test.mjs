import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

function assertStderrMatches(plan, patterns) {
  for (const pattern of patterns) {
    assert.match(plan.stderr, pattern);
  }
}

async function planCheckWithSources(sources) {
  return planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: sources.length,
          freshSourceCount: 0,
          issueCount: sources.length,
        },
        sources,
      }),
    }),
  );
}

test("plans check text artifact evidence failures with render repair commands", async () => {
  const plan = await planCheckWithSources([
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
  ]);

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assertStderrMatches(plan, [
    /Missing DiagramPilot provenance: docs\/missing_provenance\.svg for docs\/missing_provenance\.dp\.yaml\. Run `diagrampilot render docs\/missing_provenance\.dp\.yaml --out docs\/missing_provenance\.svg`\./,
    /Unreadable SVG artifact: docs\/unreadable\.svg for docs\/unreadable\.dp\.yaml\. Run `diagrampilot render docs\/unreadable\.dp\.yaml --out docs\/unreadable\.svg`\./,
    /Malformed SVG artifact: docs\/malformed\.svg for docs\/malformed\.dp\.yaml\. Run `diagrampilot render docs\/malformed\.dp\.yaml --out docs\/malformed\.svg`\./,
  ]);
  assert.doesNotMatch(plan.stderr, /EACCES|Malformed DiagramPilot provenance/);
});

test("plans check text source path mismatch failures with a Windows path hint", async () => {
  const plan = await planCheckWithSources([
    {
      sourcePath: "docs/architecture.dp.yaml",
      validation: {
        ok: true,
        errors: [],
      },
      artifact: {
        status: "stale",
        path: "docs/architecture.svg",
        reasons: ["source-path-mismatch"],
        expected: {
          sourcePath: "docs/architecture.dp.yaml",
          sourceSha256: "hash",
          diagramPilotVersion: "0.4.0",
          renderer: {
            name: "@terrastruct/d2",
            version: "0.1.33",
          },
        },
        actual: {
          sourcePath: String.raw`docs\architecture.dp.yaml`,
          sourceSha256: "hash",
          diagramPilotVersion: "0.4.0",
          renderer: {
            name: "@terrastruct/d2",
            version: "0.1.33",
          },
        },
      },
    },
  ]);

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.match(
    plan.stderr,
    /Stale SVG artifact: docs\/architecture\.svg for docs\/architecture\.dp\.yaml \(source-path-mismatch\)\. Path differs only by separator style; rerun render with forward-slash paths\. Run `diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg`\./,
  );
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
              {
                format: "markdown",
                status: "stale",
                path: "docs/architecture.md",
                reasons: ["referenced-artifact-missing"],
                references: [
                  {
                    format: "png",
                    path: "docs/architecture.png",
                    status: "missing-artifact",
                  },
                ],
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
  assertStderrMatches(plan, [
    /Stale D2 artifact: docs\/architecture\.d2 for docs\/architecture\.dp\.yaml \(content-mismatch\)\. Run `diagrampilot export docs\/architecture\.dp\.yaml --format d2 --out docs\/architecture\.d2`\./,
    /Missing PNG artifact: docs\/architecture\.png for docs\/architecture\.dp\.yaml\. Run `diagrampilot render docs\/architecture\.dp\.yaml --format png --out docs\/architecture\.png`\./,
    /Stale Markdown artifact: docs\/architecture\.md for docs\/architecture\.dp\.yaml \(referenced-artifact-missing\)\. Run `diagrampilot generate docs\/architecture\.dp\.yaml`\./,
  ]);
  assert.doesNotMatch(plan.stderr, /old-hash|new-hash/);
});
