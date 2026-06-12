import assert from "node:assert/strict";
import test from "node:test";

import { planCommand } from "../packages/cli/dist/index.js";
import { createPlanningDependencies } from "./cli-command-planning-helpers.mjs";

function iconPlanningDependencies(iconNames) {
  return createPlanningDependencies({
    listPackagedLucideIconNames: () => iconNames,
  });
}

test("plans icons list as sorted packaged Lucide icon references", async () => {
  const plan = await planCommand(
    ["icons", "list"],
    iconPlanningDependencies(["database", "server", "webhook"]),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "lucide:database\nlucide:server\nlucide:webhook\n",
    stderr: "",
    writes: [],
  });
});

test("plans icons search as matching packaged Lucide icon references", async () => {
  const plan = await planCommand(
    ["icons", "search", "data"],
    iconPlanningDependencies([
      "archive",
      "database",
      "database-backup",
      "server",
    ]),
  );

  assert.deepEqual(plan, {
    exitCode: 0,
    stdout: "lucide:database\nlucide:database-backup\n",
    stderr: "",
    writes: [],
  });
});

test("plans icons search without matches as a non-writing stderr failure", async () => {
  const plan = await planCommand(
    ["icons", "search", "not-real"],
    iconPlanningDependencies(["database", "server"]),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: 'No packaged Lucide icons match "not-real".\n',
    writes: [],
  });
});

test("plans icons search missing query as usage on stderr", async () => {
  const plan = await planCommand(
    ["icons", "search"],
    iconPlanningDependencies(["database", "server"]),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Missing icon search query.",
      "Usage:",
      "  diagrampilot icons list",
      "  diagrampilot icons search <query>",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans icons list extra arguments as usage on stderr", async () => {
  const plan = await planCommand(
    ["icons", "list", "database"],
    iconPlanningDependencies(["database", "server"]),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Unexpected icons argument: database",
      "Usage:",
      "  diagrampilot icons list",
      "  diagrampilot icons search <query>",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans unknown icons subcommands as usage on stderr", async () => {
  const plan = await planCommand(
    ["icons", "remove", "database"],
    iconPlanningDependencies(["database", "server"]),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Unknown icons subcommand: remove",
      "Usage:",
      "  diagrampilot icons list",
      "  diagrampilot icons search <query>",
      "",
    ].join("\n"),
    writes: [],
  });
});

test("plans icons search extra arguments as usage on stderr", async () => {
  const plan = await planCommand(
    ["icons", "search", "data", "extra"],
    iconPlanningDependencies(["database", "server"]),
  );

  assert.deepEqual(plan, {
    exitCode: 1,
    stdout: "",
    stderr: [
      "Unexpected icons argument: extra",
      "Usage:",
      "  diagrampilot icons list",
      "  diagrampilot icons search <query>",
      "",
    ].join("\n"),
    writes: [],
  });
});
