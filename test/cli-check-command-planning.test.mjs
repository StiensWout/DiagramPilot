import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

test("plans check no-source directory scopes as a successful no-op with no writes", async () => {
  const plan = await planCommand(["check"], createPlanningDependencies());

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "No DiagramPilot Source Files found in /repo.\n",
    stderr: "",
    writes: [],
  });
});

test("plans check by delegating Repo Workflow Check to the command adapter", async () => {
  let receivedOptions;
  const plan = await planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async (options) => {
        receivedOptions = options;

        return {
          ok: true,
          scope: { kind: "directory", path: "/repo" },
          summary: {
            checkedSourceCount: 1,
            freshSourceCount: 1,
            issueCount: 0,
          },
          sources: [
            {
              sourcePath: "docs/architecture.dp.yaml",
              validation: {
                ok: true,
                errors: [],
              },
              artifact: {
                status: "fresh",
                path: "docs/architecture.svg",
                provenance: {
                  sourcePath: "docs/architecture.dp.yaml",
                  sourceSha256: "hash",
                  diagramPilotVersion: "0.1.0",
                  renderer: { name: "@terrastruct/d2", version: "0.1.33" },
                },
              },
            },
          ],
        };
      },
      discoverDiagramPilotSourceFiles: async () => {
        throw new Error("check planning should delegate discovery");
      },
      loadValidatedDiagramSpec: () => {
        throw new Error("check planning should delegate source loading");
      },
      checkExpectedSvgArtifactFreshnessForValidatedSource: async () => {
        throw new Error("check planning should delegate artifact freshness");
      },
    }),
  );

  assert.equal(typeof receivedOptions.exportConfiguredTextArtifact, "function");
  assert.equal(
    receivedOptions.exportConfiguredTextArtifact({
      format: "mermaid",
      spec: {
        version: 1,
        title: "Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
    }),
    "flowchart LR\n",
  );
  assert.deepEqual(
    {
      scopePath: receivedOptions.scopePath,
      diagramPilotVersion: receivedOptions.diagramPilotVersion,
      renderer: receivedOptions.renderer,
    },
    {
      scopePath: undefined,
      diagramPilotVersion: "0.1.0",
      renderer: { name: "@terrastruct/d2", version: "0.1.33" },
    },
  );
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout:
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    stderr: "",
    writes: [],
  });
});

test("plans check text success as a concise summary without listing every fresh source", async () => {
  const plan = await planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 1,
          freshSourceCount: 1,
          issueCount: 0,
        },
        sources: [
          {
            sourcePath: "docs/architecture.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "fresh",
              path: "docs/architecture.svg",
              provenance: {
                sourcePath: "docs/architecture.dp.yaml",
                sourceSha256: "hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
            },
          },
        ],
      }),
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout:
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    stderr: "",
    writes: [],
  });
  assert.doesNotMatch(plan.stdout, /architecture\.dp\.yaml/);
});

test("plans check passes one explicit scope path to Repo Workflow Check", async () => {
  let receivedOptions;

  const plan = await planCommand(
    ["check", "docs/architecture.dp.yaml"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async (options) => {
        receivedOptions = options;

        return {
          ok: true,
          scope: { kind: "file", path: "docs/architecture.dp.yaml" },
          summary: {
            checkedSourceCount: 1,
            freshSourceCount: 1,
            issueCount: 0,
          },
          sources: [
            {
              sourcePath: "docs/architecture.dp.yaml",
              validation: {
                ok: true,
                errors: [],
              },
              artifact: {
                status: "fresh",
                path: "docs/architecture.svg",
                provenance: {
                  sourcePath: "docs/architecture.dp.yaml",
                  sourceSha256: "hash",
                  diagramPilotVersion: "0.1.0",
                  renderer: { name: "@terrastruct/d2", version: "0.1.33" },
                },
              },
            },
          ],
        };
      },
    }),
  );

  assert.equal(plan.exitCode, 0);
  assert.equal(receivedOptions.scopePath, "docs/architecture.dp.yaml");
  assert.deepEqual(plan.writes, []);
});

test("plans check text failures with concise repair commands for invalid, missing, and stale sources", async () => {
  const plan = await planCommand(
    ["check"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 4,
          freshSourceCount: 1,
          issueCount: 3,
        },
        sources: [
          {
            sourcePath: "docs/fresh.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "fresh",
              path: "docs/fresh.svg",
              provenance: {
                sourcePath: "docs/fresh.dp.yaml",
                sourceSha256: "hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
            },
          },
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
            artifact: {
              status: "unchecked",
            },
          },
          {
            sourcePath: "docs/missing.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "missing-artifact",
              path: "docs/missing.svg",
            },
          },
          {
            sourcePath: "docs/stale.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "stale",
              path: "docs/stale.svg",
              reasons: ["source-sha256-mismatch", "renderer-version-mismatch"],
              expected: {
                sourcePath: "docs/stale.dp.yaml",
                sourceSha256: "new-hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
              actual: {
                sourcePath: "docs/stale.dp.yaml",
                sourceSha256: "old-hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.32" },
              },
            },
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
    /^Checked 4 DiagramPilot Source Files\. Found 3 workflow issues\.\n/m,
  );
  assert.match(
    plan.stderr,
    /Invalid source: docs\/invalid\.dp\.yaml\. Run `diagrampilot validate docs\/invalid\.dp\.yaml`\./,
  );
  assert.match(
    plan.stderr,
    /Missing SVG artifact: docs\/missing\.svg for docs\/missing\.dp\.yaml\. Run `diagrampilot render docs\/missing\.dp\.yaml --out docs\/missing\.svg`\./,
  );
  assert.match(
    plan.stderr,
    /Stale SVG artifact: docs\/stale\.svg for docs\/stale\.dp\.yaml \(source-sha256-mismatch, renderer-version-mismatch\)\. Run `diagrampilot render docs\/stale\.dp\.yaml --out docs\/stale\.svg`\./,
  );
  assert.doesNotMatch(plan.stderr, /DiagramSpec validation error/);
  assert.doesNotMatch(plan.stderr, /Bad value:/);
  assert.doesNotMatch(plan.stderr, /old-hash|new-hash|0\.1\.32/);
});

test("plans check json as an aggregate result including fresh and stale sources", async () => {
  const plan = await planCommand(
    ["check", "--json"],
    createPlanningDependencies({
      checkDiagramPilotRepoWorkflow: async () => ({
        ok: true,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 3,
          freshSourceCount: 1,
          issueCount: 2,
        },
        sources: [
          {
            sourcePath: "docs/fresh.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "fresh",
              path: "docs/fresh.svg",
              provenance: {
                sourcePath: "/repo/docs/fresh.dp.yaml",
                sourceSha256: "hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
            },
          },
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
            artifact: {
              status: "unchecked",
            },
          },
          {
            sourcePath: "docs/stale.dp.yaml",
            validation: {
              ok: true,
              errors: [],
            },
            artifact: {
              status: "stale",
              path: "docs/stale.svg",
              reasons: ["source-path-mismatch"],
              expected: {
                sourcePath: "docs/stale.dp.yaml",
                sourceSha256: "expected-hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
              actual: {
                sourcePath: "docs/other.dp.yaml",
                sourceSha256: "expected-hash",
                diagramPilotVersion: "0.1.0",
                renderer: { name: "@terrastruct/d2", version: "0.1.33" },
              },
            },
          },
        ],
      }),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const result = JSON.parse(plan.stdout);

  assert.equal(result.ok, false);
  assert.deepEqual(result.scope, { kind: "directory", path: "/repo" });
  assert.deepEqual(result.summary, {
    checkedSourceCount: 3,
    freshSourceCount: 1,
    issueCount: 2,
  });
  assert.equal(result.sources.length, 3);
  assert.deepEqual(result.sources[0], {
    sourcePath: "docs/fresh.dp.yaml",
    validation: {
      ok: true,
      errors: [],
    },
    artifact: {
      status: "fresh",
      path: "docs/fresh.svg",
      provenance: {
        sourcePath: "/repo/docs/fresh.dp.yaml",
        sourceSha256: "hash",
        diagramPilotVersion: "0.1.0",
        renderer: { name: "@terrastruct/d2", version: "0.1.33" },
      },
    },
  });
  assert.equal(result.sources[1].sourcePath, "docs/invalid.dp.yaml");
  assert.equal(result.sources[1].validation.ok, false);
  assert.deepEqual(result.sources[1].artifact, { status: "unchecked" });
  assert.equal(result.sources[2].artifact.status, "stale");
  assert.deepEqual(result.sources[2].artifact.reasons, [
    "source-path-mismatch",
  ]);
  assert.equal(result.sources[2].artifact.expected.sourcePath, "docs/stale.dp.yaml");
  assert.equal(result.sources[2].artifact.actual.sourcePath, "docs/other.dp.yaml");
});

test("plans check unknown options as usage on stderr", async () => {
  const plan = await planCommand(
    ["check", "--quiet"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      "Unknown check option: --quiet\nUsage: diagrampilot check [path] [--json]\n",
    writes: [],
  });
});
