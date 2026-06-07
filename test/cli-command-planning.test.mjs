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

function readFailure(path = "docs/missing.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "read",
      path,
      message: "ENOENT: no such file or directory",
    },
  };
}

function parseFailure(path = "docs/broken.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "parse",
      format: "yaml",
      path,
      message: "Unexpected end of file",
      line: 3,
      column: 1,
    },
  };
}

function validationFailure(path = "docs/invalid.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "validation",
      source: {
        format: "yaml",
        path,
        value: {
          version: 1,
          nodes: [{ id: "web_app", label: "Web App" }],
        },
      },
      errors: [
        {
          path: "title",
          message: "Missing required top-level field: title.",
          expected: "Required top-level fields: version, title, nodes.",
          suggestion: "Add a title field.",
        },
      ],
    },
  };
}

function createPlanningDependencies(overrides = {}) {
  return {
    loadValidatedDiagramSpec: () => validLoadResult(),
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

test("plans validate success as stdout with no file writes", async () => {
  const plan = await planCommand(
    ["validate", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "Valid docs/architecture.dp.yaml\n",
    stderr: "",
    writes: [],
  });
});

test("plans validate missing source path as usage on stderr", async () => {
  const plan = await planCommand(["validate"], createPlanningDependencies());

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      "Missing source path.\nUsage: diagrampilot validate <path> [--json]\n",
    writes: [],
  });
});

test("plans validate read failures as structured JSON on stdout", async () => {
  const plan = await planCommand(
    ["validate", "docs/missing.dp.yaml", "--json"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => readFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stderr, "");
  assert.deepEqual(plan.writes, []);

  const result = JSON.parse(plan.stdout);

  assert.equal(result.file, "docs/missing.dp.yaml");
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);
  assert.match(
    result.errors[0].message,
    /^Unable to read docs\/missing\.dp\.yaml:/,
  );
  assert.equal(result.errors[0].path, "$");
});

test("plans validate parse failures as text on stderr", async () => {
  const plan = await planCommand(
    ["validate", "docs/broken.dp.yaml"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => parseFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.equal(plan.writes.length, 0);
  assert.match(
    plan.stderr,
    /^YAML parse error in docs\/broken\.dp\.yaml at line 3, column 1:/,
  );
});

test("plans validate semantic failures as repairable stderr diagnostics", async () => {
  const plan = await planCommand(
    ["validate", "docs/invalid.dp.yaml"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  assert.match(
    plan.stderr,
    /DiagramSpec validation error in docs\/invalid\.dp\.yaml: Missing required top-level field: title\./,
  );
  assert.match(plan.stderr, /Path: title/);
  assert.match(plan.stderr, /Suggestion: Add a title field\./);
});

test("plans export Mermaid success as stdout with no file writes", async () => {
  const plan = await planCommand(
    ["export", "docs/architecture.dp.yaml", "--format", "mermaid"],
    createPlanningDependencies({
      exportDiagramSpecToMermaid: () => "flowchart LR\n  web_app[\"Web App\"]\n",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "flowchart LR\n  web_app[\"Web App\"]\n",
    stderr: "",
    writes: [],
  });
});

test("plans export missing format as usage on stderr", async () => {
  const plan = await planCommand(
    ["export", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Missing export format.",
      "Usage:",
      "  diagrampilot export <path> --format mermaid [--out <path>]",
      "  diagrampilot export <path> --format d2 [--out <path>]",
      "  diagrampilot export <path> --format dot [--out <path>]",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans export D2 success as a file write when out is provided", async () => {
  const plan = await planCommand(
    [
      "export",
      "docs/architecture.dp.yaml",
      "--format",
      "d2",
      "--out",
      "docs/architecture.d2",
    ],
    createPlanningDependencies({
      exportDiagramSpecToD2: () => "direction: right\n",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.d2",
        content: "direction: right\n",
      },
    ],
  });
});

test("plans export DOT success as stdout with no file writes", async () => {
  const plan = await planCommand(
    ["export", "docs/architecture.dp.yaml", "--format", "dot"],
    createPlanningDependencies({
      exportDiagramSpecToDot: () => "digraph checkout_architecture {\n}\n",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "digraph checkout_architecture {\n}\n",
    stderr: "",
    writes: [],
  });
});

test("plans export DOT success as a file write when out is provided", async () => {
  const plan = await planCommand(
    [
      "export",
      "docs/architecture.dp.yaml",
      "--format",
      "dot",
      "--out",
      "docs/architecture.dot",
    ],
    createPlanningDependencies({
      exportDiagramSpecToDot: () => "digraph checkout_architecture {\n}\n",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.dot",
        content: "digraph checkout_architecture {\n}\n",
      },
    ],
  });
});

test("plans export validation failures without stdout or file writes", async () => {
  const plan = await planCommand(
    ["export", "docs/invalid.dp.yaml", "--format", "mermaid"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  assert.match(plan.stderr, /DiagramSpec validation error in docs\/invalid/);
});

test("plans render success as an SVG file write", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml", "--out", "docs/architecture.svg"],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => "<svg><title>Checkout</title></svg>",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.svg",
        content: "<svg><title>Checkout</title></svg>",
      },
    ],
  });
});

test("plans render explicit SVG format as an SVG file write", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml", "--format", "svg", "--out", "docs/architecture.svg"],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => "<svg><title>Checkout</title></svg>",
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.svg",
        content: "<svg><title>Checkout</title></svg>",
      },
    ],
  });
});

test("plans render PNG by rasterizing the current SVG render output", async () => {
  const renderedSvg = "<svg><title>Checkout</title></svg>";
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  let rasterizedSvg;

  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--format",
      "png",
      "--out",
      "docs/architecture.png",
    ],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => renderedSvg,
      rasterizeSvgToPng: (svg) => {
        rasterizedSvg = svg;

        return pngBytes;
      },
    }),
  );

  assert.equal(rasterizedSvg, renderedSvg);
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [
      {
        path: "docs/architecture.png",
        content: pngBytes,
      },
    ],
  });
});

test("plans render missing output path as usage on stderr", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Missing render output path.",
      "Usage:",
      "  diagrampilot render <path> --out <path>",
      "  diagrampilot render <path> --format svg --out <path>",
      "  diagrampilot render <path> --format png --out <path>",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans unsupported render format as repairable usage without loading the source", async () => {
  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--format",
      "pdf",
      "--out",
      "docs/architecture.pdf",
    ],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => {
        throw new Error("unsupported format should fail before source loading");
      },
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Unsupported render format: pdf",
      "Usage:",
      "  diagrampilot render <path> --out <path>",
      "  diagrampilot render <path> --format svg --out <path>",
      "  diagrampilot render <path> --format png --out <path>",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans render validation failures without an SVG write", async () => {
  const plan = await planCommand(
    ["render", "docs/invalid.dp.yaml", "--out", "docs/invalid.svg"],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  assert.match(plan.stderr, /DiagramSpec validation error in docs\/invalid/);
});

test("plans render PNG validation failures before render adapter side effects", async () => {
  const plan = await planCommand(
    [
      "render",
      "docs/invalid.dp.yaml",
      "--format",
      "png",
      "--out",
      "docs/invalid.png",
    ],
    createPlanningDependencies({
      loadValidatedDiagramSpec: () => validationFailure(),
      renderDiagramSpecToSvg: async () => {
        throw new Error("invalid source should not render SVG");
      },
      rasterizeSvgToPng: () => {
        throw new Error("invalid source should not rasterize PNG");
      },
    }),
  );

  assert.equal(plan.exitCode, 1);
  assert.equal(plan.stdout, "");
  assert.deepEqual(plan.writes, []);
  assert.match(plan.stderr, /DiagramSpec validation error in docs\/invalid/);
});

test("plans render adapter failures as stderr without file writes", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml", "--out", "docs/architecture.svg"],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => {
        throw new Error("D2 failed");
      },
    }),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: "Unable to render docs/architecture.dp.yaml: D2 failed\n",
    writes: [],
  });
});

test("plans version output", async () => {
  const plan = await planCommand(["--version"], createPlanningDependencies());

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "diagrampilot 0.1.0\n",
    stderr: "",
    writes: [],
  });
});

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

  assert.deepEqual(receivedOptions, {
    scopePath: undefined,
    diagramPilotVersion: "0.1.0",
    renderer: { name: "@terrastruct/d2", version: "0.1.33" },
  });
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
    stderr: "Unknown check option: --quiet\nUsage: diagrampilot check [path] [--json]\n",
    writes: [],
  });
});
