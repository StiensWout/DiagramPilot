import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

const simpleMermaidFlowchart = [
  "flowchart LR",
  '  web["Web App"] -->|HTTPS| api["API Gateway"]',
  "",
].join("\n");

const simpleD2Diagram = [
  "cloud: Cloud Services {",
  "  api: Orders API",
  "  db: Orders DB",
  "}",
  "cloud.api -> cloud.db: writes",
  "",
].join("\n");

const simpleDotDiagram = [
  "digraph G {",
  "  rankdir=LR;",
  '  api [label="Orders API"];',
  '  db [label="Orders DB"];',
  '  api -> db [label="writes"];',
  "}",
  "",
].join("\n");

async function planImport(args, overrides = {}) {
  return await planCommand(
    ["import", ...args],
    createPlanningDependencies({
      pathExists: () => false,
      readSourceContent: () => simpleMermaidFlowchart,
      ...overrides,
    }),
  );
}

function assertSourceMatches(source, patterns) {
  assert.equal(typeof source, "string");
  for (const pattern of patterns) {
    assert.match(source, pattern);
  }
}

function assertSuccessfulImportPlan(plan, { outputPath, stdoutPattern }) {
  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].path, outputPath);
  assert.match(plan.stdout, stdoutPattern);
  assert.match(plan.stdout, /Fidelity summary:/);
  assert.match(plan.stdout, /Preserved:/);
  assert.match(plan.stdout, /Approximated:/);
  assert.match(plan.stdout, /Dropped:/);
}

function assertJsonImportPlan(
  plan,
  { format, input, output, nodeIds, edge },
) {
  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.equal(plan.writes.length, 1);

  const payload = JSON.parse(plan.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.format, format);
  assert.equal(payload.input, input);
  assert.equal(payload.output, output);
  assert.deepEqual(payload.spec.nodes.map((node) => node.id), nodeIds);
  assert.deepEqual(payload.spec.edges[0], edge);
  assert.equal(payload.fidelity.summary.dropped, 0);
  assert.equal(
    payload.fidelity.diagnostics.some(
      (diagnostic) => diagnostic.construct === "direction",
    ),
    true,
  );
}

test("plans Mermaid import as a DiagramPilot Source File write with fidelity text", async () => {
  const plan = await planImport([
    "docs/legacy.mmd",
    "--format",
    "mermaid",
    "--out",
    "docs/architecture.dp.yaml",
  ]);

  assertSuccessfulImportPlan(plan, {
    outputPath: "docs/architecture.dp.yaml",
    stdoutPattern: /Imported docs\/legacy\.mmd to docs\/architecture\.dp\.yaml\./,
  });

  assertSourceMatches(plan.writes[0].content, [
    /^version: 1$/m,
    /^title: Imported Mermaid Diagram$/m,
    /^direction: right$/m,
    /^  - id: web$/m,
    /^    label: Web App$/m,
    /^  - id: api$/m,
    /^    label: API Gateway$/m,
    /^  - id: web_to_api$/m,
    /^    from: web$/m,
    /^    to: api$/m,
    /^    label: HTTPS$/m,
  ]);
});

test("plans D2 import as a DiagramPilot Source File write with fidelity text", async () => {
  const plan = await planImport(
    [
      "docs/legacy.d2",
      "--format",
      "d2",
      "--out",
      "docs/architecture.dp.yaml",
    ],
    { readSourceContent: () => simpleD2Diagram },
  );

  assertSuccessfulImportPlan(plan, {
    outputPath: "docs/architecture.dp.yaml",
    stdoutPattern: /Imported docs\/legacy\.d2 to docs\/architecture\.dp\.yaml\./,
  });

  assertSourceMatches(plan.writes[0].content, [
    /^version: 1$/m,
    /^title: Imported D2 Diagram$/m,
    /^direction: right$/m,
    /^  - id: cloud_api$/m,
    /^    label: Orders API$/m,
    /^  - id: cloud_db$/m,
    /^    label: Orders DB$/m,
    /^  - id: cloud$/m,
    /^    label: Cloud Services$/m,
    /^  - id: cloud_api_to_cloud_db$/m,
    /^    from: cloud_api$/m,
    /^    to: cloud_db$/m,
    /^    label: writes$/m,
  ]);
});

test("plans Mermaid import overwrite protection with explicit force escape hatch", async () => {
  const existingPath = "docs/architecture.dp.yaml";
  const withoutForce = await planImport(
    ["docs/legacy.mmd", "--format", "mermaid", "--out", existingPath],
    { pathExists: (candidate) => candidate === existingPath },
  );

  assert.equal(withoutForce.exitCode, 1);
  assert.equal(withoutForce.stdout, "");
  assert.match(
    withoutForce.stderr,
    /DiagramPilot Source File already exists: docs\/architecture\.dp\.yaml/,
  );
  assert.match(withoutForce.stderr, /rerun import with --force/);
  assert.deepEqual(withoutForce.writes, []);

  const withForce = await planImport(
    [
      "docs/legacy.mmd",
      "--format",
      "mermaid",
      "--out",
      existingPath,
      "--force",
    ],
    { pathExists: (candidate) => candidate === existingPath },
  );

  assert.equal(withForce.exitCode, 0);
  assert.equal(withForce.stderr, "");
  assert.equal(withForce.writes.length, 1);
  assert.equal(withForce.writes[0].path, existingPath);
});

test("applies overwrite protection to D2 and DOT imports", async () => {
  const existingPath = "docs/architecture.dp.yaml";
  const cases = [
    {
      format: "d2",
      input: "docs/legacy.d2",
      content: simpleD2Diagram,
    },
    {
      format: "dot",
      input: "docs/legacy.dot",
      content: simpleDotDiagram,
    },
  ];

  for (const item of cases) {
    const plan = await planImport(
      [item.input, "--format", item.format, "--out", existingPath],
      {
        pathExists: (candidate) => candidate === existingPath,
        readSourceContent: () => item.content,
      },
    );

    assert.equal(plan.exitCode, 1);
    assert.equal(plan.stdout, "");
    assert.match(
      plan.stderr,
      /DiagramPilot Source File already exists: docs\/architecture\.dp\.yaml/,
    );
    assert.deepEqual(plan.writes, []);
  }
});

test("plans Mermaid import JSON output with spec and fidelity diagnostics", async () => {
  const plan = await planImport([
    "docs/legacy.mmd",
    "--format",
    "mermaid",
    "--out",
    "docs/architecture.dp.yaml",
    "--json",
  ]);

  assertJsonImportPlan(plan, {
    format: "mermaid",
    input: "docs/legacy.mmd",
    output: "docs/architecture.dp.yaml",
    nodeIds: ["web", "api"],
    edge: {
      id: "web_to_api",
      from: "web",
      to: "api",
      label: "HTTPS",
    },
  });
});

test("plans DOT import JSON output with the shared import result shape", async () => {
  const plan = await planImport(
    [
      "docs/legacy.dot",
      "--format",
      "dot",
      "--out",
      "docs/architecture.dp.yaml",
      "--json",
    ],
    { readSourceContent: () => simpleDotDiagram },
  );

  assertJsonImportPlan(plan, {
    format: "dot",
    input: "docs/legacy.dot",
    output: "docs/architecture.dp.yaml",
    nodeIds: ["api", "db"],
    edge: {
      id: "api_to_db",
      from: "api",
      to: "db",
      label: "writes",
    },
  });
});
