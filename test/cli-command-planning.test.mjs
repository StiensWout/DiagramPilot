import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";

function validLoadResult(sourcePath = "docs/architecture.dp.yaml") {
  return {
    ok: true,
    source: {
      format: "yaml",
      path: sourcePath,
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
    exportDiagramSpecToMermaid: () => "flowchart LR\n",
    exportDiagramSpecToD2: () => "direction: right\n",
    readSourceContent: () => "version: 1\n",
    renderDiagramSpecToSvg: async () => "<svg></svg>",
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

test("plans render missing output path as usage on stderr", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml"],
    createPlanningDependencies(),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      "Missing render output path.\nUsage: diagrampilot render <path> --out <path>\n",
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
