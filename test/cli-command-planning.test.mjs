import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import {
  assertJsonFailurePlan,
  assertStderrFailurePlan,
  createPlanningDependencies,
  parseFailure,
  readFailure,
  validLoadResult,
  validationFailure,
} from "./cli-command-planning-helpers.mjs";

function assertSingleWritePlan(plan, write) {
  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "",
    stderr: "",
    writes: [write],
  });
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

  const result = assertJsonFailurePlan(plan);

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

  assertStderrFailurePlan(plan, [
    /DiagramSpec validation error in docs\/invalid\.dp\.yaml: Missing required top-level field: title\./,
    /Path: title/,
    /Suggestion: Add a title field\./,
  ]);
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

  assertStderrFailurePlan(plan, [
    /DiagramSpec validation error in docs\/invalid/,
  ]);
});

test("plans render success as an SVG file write", async () => {
  const plan = await planCommand(
    ["render", "docs/architecture.dp.yaml", "--out", "docs/architecture.svg"],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => "<svg><title>Checkout</title></svg>",
    }),
  );

  assertSingleWritePlan(plan, {
    path: "docs/architecture.svg",
    content: "<svg><title>Checkout</title></svg>",
  });
});

test("plans render explicit SVG format as an SVG file write", async () => {
  const plan = await planCommand(
    [
      "render",
      "docs/architecture.dp.yaml",
      "--format",
      "svg",
      "--out",
      "docs/architecture.svg",
    ],
    createPlanningDependencies({
      renderDiagramSpecToSvg: async () => "<svg><title>Checkout</title></svg>",
    }),
  );

  assertSingleWritePlan(plan, {
    path: "docs/architecture.svg",
    content: "<svg><title>Checkout</title></svg>",
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

  assertStderrFailurePlan(plan, [
    /DiagramSpec validation error in docs\/invalid/,
  ]);
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

  assertStderrFailurePlan(plan, [
    /DiagramSpec validation error in docs\/invalid/,
  ]);
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

test("plans subcommand help output", async () => {
  for (const [command, expectedUsage] of [
    ["check", "Usage: diagrampilot check [path] [--json]\n"],
    [
      "create",
      "Usage: diagrampilot create <path> --template architecture|flow|package-map|system-context|service-map\n",
    ],
    ["format", "Usage: diagrampilot format <path>\n"],
    ["generate", "Usage: diagrampilot generate [path] [--json]\n"],
    ["inspect", "Usage: diagrampilot inspect [path] [--json]\n"],
    [
      "render",
      [
        "Usage:",
        "  diagrampilot render <path> --out <path>",
        "  diagrampilot render <path> --format svg --out <path>",
        "  diagrampilot render <path> --format png --out <path>",
        "",
      ].join("\n"),
    ],
    [
      "export",
      [
        "Usage:",
        "  diagrampilot export <path> --format mermaid [--out <path>]",
        "  diagrampilot export <path> --format d2 [--out <path>]",
        "  diagrampilot export <path> --format dot [--out <path>]",
        "",
      ].join("\n"),
    ],
  ]) {
    const plan = await planCommand([command, "--help"], createPlanningDependencies());

    assert.deepEqual(plan, {
      exitCode: 0,
      stdout: expectedUsage,
      stderr: "",
      writes: [],
    });
  }
});
