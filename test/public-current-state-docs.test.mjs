import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  publicAgentDocs,
  repoRoot,
} from "./docs-public-boundary-helpers.mjs";

const publicSurfaceFiles = [
  "README.md",
  "llms.txt",
  "website/src/pages/index.astro",
  "docs-public/index.md",
  ...publicAgentDocs.map((fileName) => path.join("docs-public", "agents", fileName)),
  "packages/cli/README.md",
  "packages/core/README.md",
  "packages/export-d2/README.md",
  "packages/export-dot/README.md",
  "packages/export-mermaid/README.md",
  "packages/icons/README.md",
  "packages/mcp/README.md",
  "packages/render-svg/README.md",
];

const releaseStoryPatterns = [
  /\bv?0\.\d+\.\d+\b/i,
  /\b0\.\d+\s*->\s*0\.\d+\b/i,
  /\balpha\b/i,
  /\bbeta\b/i,
  /upgrade guide/i,
  /migration guide/i,
  /release-aligned/i,
  /current public release/i,
  /Manual Milestone Release/i,
];

test("public documentation describes current behavior without release-story framing", async () => {
  for (const repoPath of publicSurfaceFiles) {
    const source = await readFile(path.join(repoRoot, repoPath), "utf8");

    for (const pattern of releaseStoryPatterns) {
      assert.doesNotMatch(source, pattern, repoPath);
    }
  }
});
