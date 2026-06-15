import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

const simpleMermaidFlowchart = [
  "flowchart LR",
  '  web["Web App"] -->|HTTPS| api["API Gateway"]',
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

test("plans Mermaid import as a DiagramPilot Source File write with fidelity text", async () => {
  const plan = await planImport([
    "docs/legacy.mmd",
    "--format",
    "mermaid",
    "--out",
    "docs/architecture.dp.yaml",
  ]);

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].path, "docs/architecture.dp.yaml");
  assert.match(plan.stdout, /Imported docs\/legacy\.mmd to docs\/architecture\.dp\.yaml\./);
  assert.match(plan.stdout, /Fidelity summary:/);
  assert.match(plan.stdout, /Preserved:/);
  assert.match(plan.stdout, /Approximated:/);
  assert.match(plan.stdout, /Dropped:/);

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

test("plans Mermaid import JSON output with spec and fidelity diagnostics", async () => {
  const plan = await planImport([
    "docs/legacy.mmd",
    "--format",
    "mermaid",
    "--out",
    "docs/architecture.dp.yaml",
    "--json",
  ]);

  assert.equal(plan.exitCode, 0);
  assert.equal(plan.stderr, "");
  assert.equal(plan.writes.length, 1);

  const payload = JSON.parse(plan.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.format, "mermaid");
  assert.equal(payload.input, "docs/legacy.mmd");
  assert.equal(payload.output, "docs/architecture.dp.yaml");
  assert.deepEqual(payload.spec.nodes.map((node) => node.id), ["web", "api"]);
  assert.deepEqual(payload.spec.edges[0], {
    id: "web_to_api",
    from: "web",
    to: "api",
    label: "HTTPS",
  });
  assert.equal(payload.fidelity.summary.dropped, 0);
  assert.equal(
    payload.fidelity.diagnostics.some(
      (diagnostic) => diagnostic.construct === "direction",
    ),
    true,
  );
});
