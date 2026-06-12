import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./docs-public-boundary-helpers.mjs";

test("GitHub-rendered README links same-repo public docs relatively", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assert.match(
    readme,
    /\[Installation and removal guide]\(docs-public\/agents\/installation\.md\)/,
  );
  assert.match(
    readme,
    /\[Checkout demo quickstart]\(docs-public\/agents\/quickstart\.md\)/,
  );
  assert.match(readme, /\[MCP guide]\(docs-public\/agents\/mcp\.md\)/);
  assert.match(readme, /\[Public documentation]\(docs-public\/index\.md\)/);
  assert.match(
    readme,
    /\[DiagramSpec v1 JSON Schema]\(schema\/diagramspec-v1\.schema\.json\)/,
  );
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/schema\//);
});

test("package README links remain hosted for npm consumers", async () => {
  const packageReadmePaths = [
    "packages/cli/README.md",
    "packages/core/README.md",
    "packages/icons/README.md",
    "packages/export-mermaid/README.md",
    "packages/export-d2/README.md",
    "packages/export-dot/README.md",
    "packages/mcp/README.md",
    "packages/render-svg/README.md",
  ];

  for (const repoPath of packageReadmePaths) {
    const readme = await readFile(path.join(repoRoot, repoPath), "utf8");

    assert.match(readme, /https:\/\/diagrampilot\.com\/docs\/agents\//, repoPath);
    assert.doesNotMatch(readme, /docs-public\//, repoPath);
    assert.doesNotMatch(readme, /\]\(agents\//, repoPath);
  }
});
