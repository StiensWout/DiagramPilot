import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

test("plans generate for a zero-config source file as one SVG write", async () => {
  const plan = await planCommand(
    ["generate", "docs/architecture.dp.yaml"],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => "<svg><title>Checkout</title></svg>",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "Generated 1 artifact for 1 DiagramPilot Source File.\n",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.svg",
        content: "<svg><title>Checkout</title></svg>",
      },
    ],
  });
});

test("plans generate by delegating repo workflow generation to the command adapter", async () => {
  let receivedOptions;
  let receivedProvenanceOptions;

  const plan = await planCommand(
    ["generate", ".", "--json"],
    createPlanningDependencies({
      generateDiagramPilotRepoWorkflow: async (options) => {
        receivedOptions = options;

        return {
          ok: true,
          scope: { kind: "directory", path: "." },
          summary: {
            checkedSourceCount: 1,
            writtenArtifactCount: 2,
            skippedArtifactCount: 0,
            failureCount: 0,
          },
          written: [
            {
              sourcePath: "docs/architecture.dp.yaml",
              format: "mermaid",
              path: "docs/architecture.mmd",
              absolutePath: "/repo/docs/architecture.mmd",
              content: "flowchart LR\n",
            },
            {
              sourcePath: "docs/architecture.dp.yaml",
              format: "markdown",
              path: "docs/architecture.md",
              absolutePath: "/repo/docs/architecture.md",
              content: "![Architecture](architecture.svg)\n",
            },
          ],
          skipped: [],
          failures: [],
        };
      },
      loadValidatedDiagramSpec: () => {
        throw new Error("generate planning should delegate source loading");
      },
      exportDiagramSpecToMermaid: (_spec, options) =>
        `profile:${options?.profile ?? "clean"}\n`,
      renderDiagramSpecToSvg: async (_spec, options) =>
        `<svg data-profile="${options.profile ?? "clean"}"></svg>`,
      createSvgRendererProvenance: (options) => {
        receivedProvenanceOptions = options;

        return {
          sourcePath: options.sourcePath,
          sourceSha256: "hash",
          diagramPilotVersion: "0.1.0",
          renderer: { name: "@terrastruct/d2", version: "0.1.33" },
          outputProfile: options.outputProfile,
        };
      },
    }),
  );

  assert.equal(receivedOptions.scopePath, ".");
  assert.equal(typeof receivedOptions.renderSvgArtifact, "function");
  assert.equal(
    await receivedOptions.renderSvgArtifact({
      source: {
        format: "yaml",
        path: "docs/architecture.dp.yaml",
        content: "version: 1\n",
        value: {
          version: 1,
          title: "Architecture",
          nodes: [{ id: "web_app", label: "Web App" }],
        },
      },
      provenanceSourcePath: "docs/architecture.dp.yaml",
      profile: "presentation",
      spec: {
        version: 1,
        title: "Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
      renderer: { name: "@terrastruct/d2", version: "0.1.33" },
    }),
    '<svg data-profile="presentation"></svg>',
  );
  assert.equal(receivedProvenanceOptions.outputProfile, "presentation");
  assert.equal(
    receivedOptions.exportTextArtifact({
      format: "mermaid",
      profile: "compact",
      spec: {
        version: 1,
        title: "Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
    }),
    "profile:compact\n",
  );
  assert.deepEqual(plan.writes, [
    {
      path: "/repo/docs/architecture.mmd",
      content: "flowchart LR\n",
    },
    {
      path: "/repo/docs/architecture.md",
      content: "![Architecture](architecture.svg)\n",
    },
  ]);

  const payload = JSON.parse(plan.stdout);

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.written, [
    {
      sourcePath: "docs/architecture.dp.yaml",
      format: "mermaid",
      path: "docs/architecture.mmd",
    },
    {
      sourcePath: "docs/architecture.dp.yaml",
      format: "markdown",
      path: "docs/architecture.md",
    },
  ]);
  assert.deepEqual(payload.skipped, []);
});

test("plans generate json failures without file writes", async () => {
  const plan = await planCommand(
    ["generate", "--json"],
    createPlanningDependencies({
      generateDiagramPilotRepoWorkflow: async () => ({
        ok: false,
        scope: { kind: "directory", path: "/repo" },
        summary: {
          checkedSourceCount: 1,
          writtenArtifactCount: 0,
          skippedArtifactCount: 0,
          failureCount: 1,
        },
        written: [],
        skipped: [],
        failures: [
          {
            sourcePath: "docs/invalid.dp.yaml",
            errors: [
              {
                path: "title",
                message: "Missing required top-level field: title.",
                expected: "Required top-level fields: version, title, nodes.",
                suggestion: "Add a title field.",
              },
            ],
          },
        ],
      }),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const payload = JSON.parse(plan.stdout);

  assert.equal(payload.ok, false);
  assert.deepEqual(payload.written, []);
  assert.equal(payload.failures[0].sourcePath, "docs/invalid.dp.yaml");
  assert.equal(payload.failures[0].errors[0].path, "title");
});
