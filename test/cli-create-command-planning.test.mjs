import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

const maintainedTemplateUsage =
  "architecture|flow|package-map|system-context|service-map";
const maintainedTemplateList =
  "architecture, flow, package-map, system-context, service-map";

async function planCreate(args, overrides = {}) {
  return await planCommand(
    ["create", ...args],
    createPlanningDependencies({
      pathExists: () => false,
      ...overrides,
    }),
  );
}

function assertCreateTemplatePlan(plan, expected) {
  assert.equal(plan.exitCode, 0);
  assert.match(plan.stdout, expected.createdPattern);
  assert.match(plan.stdout, expected.validatePattern);
  assert.match(plan.stdout, expected.renderPattern);
  assert.equal(plan.stderr, "");
  assert.equal(plan.writes.length, 1);
  assert.equal(plan.writes[0].path, expected.path);
  assert.match(plan.writes[0].content, expected.titlePattern);
  assert.match(plan.writes[0].content, expected.idPattern);
}

test("plans create architecture template as a DiagramPilot Source File write", async () => {
  const plan = await planCommand(
    ["create", "docs/architecture.dp.yaml", "--template", "architecture"],
    createPlanningDependencies({
      pathExists: () => false,
    }),
  );

  assertCreateTemplatePlan(plan, {
    path: "docs/architecture.dp.yaml",
    createdPattern: /Created docs\/architecture\.dp\.yaml from architecture template\./,
    validatePattern: /diagrampilot validate docs\/architecture\.dp\.yaml/,
    renderPattern:
      /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
    titlePattern: /title: Starter Architecture/,
    idPattern: /id: web_app/,
  });
  assert.match(plan.writes[0].content, /^version: 1\n/m);
});

test("plans create flow template as a DiagramPilot Source File write", async () => {
  const plan = await planCreate([
    "docs/login-flow.dp.yaml",
    "--template",
    "flow",
  ]);

  assertCreateTemplatePlan(plan, {
    path: "docs/login-flow.dp.yaml",
    createdPattern: /Created docs\/login-flow\.dp\.yaml from flow template\./,
    validatePattern: /diagrampilot validate docs\/login-flow\.dp\.yaml/,
    renderPattern:
      /diagrampilot render docs\/login-flow\.dp\.yaml --out docs\/login-flow\.svg/,
    titlePattern: /title: Starter Flow/,
    idPattern: /id: decision_point/,
  });
});

test("plans create package-map template as a DiagramPilot Source File write", async () => {
  const plan = await planCreate([
    "docs/packages.dp.yaml",
    "--template",
    "package-map",
  ]);

  assertCreateTemplatePlan(plan, {
    path: "docs/packages.dp.yaml",
    createdPattern: /Created docs\/packages\.dp\.yaml from package-map template\./,
    validatePattern: /diagrampilot validate docs\/packages\.dp\.yaml/,
    renderPattern:
      /diagrampilot render docs\/packages\.dp\.yaml --out docs\/packages\.svg/,
    titlePattern: /title: Starter Package Map/,
    idPattern: /id: app_package/,
  });
});

test("plans create system-context template as a DiagramPilot Source File write", async () => {
  const plan = await planCreate([
    "docs/system-context.dp.yaml",
    "--template",
    "system-context",
  ]);

  assertCreateTemplatePlan(plan, {
    path: "docs/system-context.dp.yaml",
    createdPattern: /Created docs\/system-context\.dp\.yaml from system-context template\./,
    validatePattern: /diagrampilot validate docs\/system-context\.dp\.yaml/,
    renderPattern:
      /diagrampilot render docs\/system-context\.dp\.yaml --out docs\/system-context\.svg/,
    titlePattern: /title: Starter System Context/,
    idPattern: /id: local_repository/,
  });
});

test("plans create service-map template as a DiagramPilot Source File write", async () => {
  const plan = await planCreate([
    "docs/service-map.dp.yaml",
    "--template",
    "service-map",
  ]);

  assertCreateTemplatePlan(plan, {
    path: "docs/service-map.dp.yaml",
    createdPattern: /Created docs\/service-map\.dp\.yaml from service-map template\./,
    validatePattern: /diagrampilot validate docs\/service-map\.dp\.yaml/,
    renderPattern:
      /diagrampilot render docs\/service-map\.dp\.yaml --out docs\/service-map\.svg/,
    titlePattern: /title: Starter Service Boundary Map/,
    idPattern: /id: edge_gateway/,
  });
});

test("plans create non-source path as usage failure without writes", async () => {
  const plan = await planCreate([
    "docs/architecture.yaml",
    "--template",
    "architecture",
  ]);

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr:
      `Create path must end with .dp.yaml.\nUsage: diagrampilot create <path> --template ${maintainedTemplateUsage}\n`,
    writes: [],
  });
});

test("plans create existing source path as failure without writes", async () => {
  const plan = await planCreate(
    ["docs/architecture.dp.yaml", "--template", "architecture"],
    { pathExists: () => true },
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "DiagramPilot Source File already exists: docs/architecture.dp.yaml",
      "Suggestion: choose a new path or remove the existing file before running create.",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans unsupported create template as usage failure with maintained template names", async () => {
  const plan = await planCreate([
    "docs/architecture.dp.yaml",
    "--template",
    "sequence",
  ]);

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      `Unsupported source template: sequence. Available templates: ${maintainedTemplateList}.`,
      `Usage: diagrampilot create <path> --template ${maintainedTemplateUsage}`,
      "",
    ].join("\n"),
    writes: [],
  });
});
