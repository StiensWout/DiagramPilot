import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

const packageManifestPaths = [
  "package.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/export-d2/package.json",
  "packages/export-dot/package.json",
  "packages/export-mermaid/package.json",
  "packages/icons/package.json",
  "packages/mcp/package.json",
  "packages/render-svg/package.json",
];
const discoveryKeywords = [
  "software-architecture",
  "codebase-diagrams",
  "dependency-diagrams",
  "diagram-as-code",
  "architecture-as-code",
  "ai-agents",
  "git",
  "ci",
];

test("README explains the agent discovery workflow", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assertMatchesAll(readme, [
    /DiagramPilot is a local-first, repo-native diagram compiler for AI coding\s+agents\./,
    /Agents use DiagramPilot to create, update, validate, and render software\s+architecture diagrams\s+directly inside a repository\./,
    /## Use It For/,
    /codebase architecture diagrams/i,
    /dependency and module maps/i,
    /service interaction diagrams/i,
    /AI-maintained documentation/i,
    /pull request architecture reviews/i,
    /repo-native diagram artifacts/i,
    /## For AI Coding Agents/,
    /inspect the repository first/i,
    /edit only `\*\.dp\.yaml`/i,
    /preserve Stable IDs/i,
    /diagrampilot format/,
    /diagrampilot validate/,
    /diagrampilot inspect/,
    /diagrampilot render/,
    /diagrampilot check/,
    /never hand-edit generated artifacts/i,
    /Mermaid is a diagram syntax/i,
    /DiagramPilot is an\s+agent-safe compiler and workflow/i,
  ]);
});

test("llms.txt exposes the canonical agent workflow", async () => {
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assertMatchesAll(llmsText, [
    /## Do/,
    /## Do Not/,
    /## Canonical Workflow/,
    /## Important Links/,
    /edit DiagramPilot Source Files/i,
    /regenerate Derived Artifacts/i,
    /do not hand-edit generated SVG, PNG, Mermaid, D2, or DOT outputs/i,
    /diagrampilot inspect/,
    /diagrampilot format/,
    /diagrampilot validate/,
    /diagrampilot render/,
    /diagrampilot check/,
    /https:\/\/diagrampilot\.com/,
  ]);
});

test("owned package metadata includes discovery keywords", async () => {
  for (const manifestPath of packageManifestPaths) {
    const manifest = JSON.parse(
      await readFile(path.join(repoRoot, manifestPath), "utf8"),
    );

    for (const keyword of discoveryKeywords) {
      assert.match(
        JSON.stringify(manifest.keywords),
        new RegExp(`"${keyword}"`, "u"),
        `${manifestPath} should include ${keyword}`,
      );
    }
  }
});
