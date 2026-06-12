import assert from "node:assert/strict";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import {
  readPublicAgentDoc,
  readRepoText,
} from "./docs-public-boundary-helpers.mjs";

test("public agent workflow guide documents the canonical authoring loop", async () => {
  const agentWorkflow = await readPublicAgentDoc("agent-workflow.md");
  const publicDocsIndex = await readRepoText("docs-public/index.md");
  const readme = await readRepoText("README.md");
  const llmsText = await readRepoText("llms.txt");

  assertMatchesAll(agentWorkflow, [
    /# Agent Workflow/,
    /DiagramPilot Source File/,
    /Derived Artifacts/,
    /diagrampilot create docs\/architecture\.dp\.yaml --template architecture/,
    /diagrampilot format docs\/architecture\.dp\.yaml/,
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
    /diagrampilot inspect docs --json/,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
    /diagrampilot check/,
    /Stable IDs/,
    /machine-readable diagnostic and inventory interface/i,
    /npm install --save-dev --save-exact diagrampilot@nightly/,
    /Nightly Builds/,
    /forward-slash paths/i,
    /Windows provenance mismatch/i,
    /do not hand-edit\s+generated SVG, PNG, Mermaid, D2, or DOT outputs/i,
  ]);

  for (const publicEntrypoint of [publicDocsIndex, readme]) {
    assert.match(
      publicEntrypoint,
      /docs-public\/agents\/agent-workflow\.md|agents\/agent-workflow\.md/,
    );
  }

  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/agent-workflow\.md/,
  );
});

test("public installation guide documents pinned nightly test installs", async () => {
  const installationGuide = await readPublicAgentDoc("installation.md");

  assertMatchesAll(installationGuide, [
    /## Nightly Build Testing/,
    /npm install --save-dev --save-exact diagrampilot@nightly/,
    /Use the normal `diagrampilot` install path for routine repository workflows/i,
    /Nightly Builds can change between publishes/i,
    /stable package docs describe the `latest` package/i,
  ]);
});
