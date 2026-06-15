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

test("repository agent guide documents nightly/main branch workflow", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.match(
    agentGuide,
    /create the Linear branch from `origin\/nightly`[\s\S]*open implementation PRs[\s\S]*to `nightly`[\s\S]*Production promotion is a PR from `nightly` to `main`; `main` remains Production and there is no `production` branch/i,
  );
  assert.doesNotMatch(agentGuide, /open PRs .* to `main`, never with `--head main`/i);
});
