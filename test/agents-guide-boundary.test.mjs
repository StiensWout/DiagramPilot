import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./docs-public-boundary-helpers.mjs";

test("repository agent guide stays compact for public repo agents", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");
  const nonBlankLineCount = agentGuide
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "").length;
  const wordCount = agentGuide.trim().split(/\s+/u).length;

  assert.ok(
    nonBlankLineCount <= 24,
    `AGENTS.md should stay compact; found ${nonBlankLineCount} non-blank lines`,
  );
  assert.ok(
    wordCount <= 190,
    `AGENTS.md should stay direct; found ${wordCount} words`,
  );
  assert.doesNotMatch(agentGuide, /\.scratch/u);
  assert.doesNotMatch(agentGuide, /create or update local markdown issues/i);
});
