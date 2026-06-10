import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./website-test-helpers.mjs";

const renderSvgSourcePath = path.join(
  repoRoot,
  "packages",
  "render-svg",
  "src",
  "index.ts",
);

test("render SVG provenance construction uses the shared core provenance model", async () => {
  const renderSvgSource = await readFile(renderSvgSourcePath, "utf8");

  assert.match(renderSvgSource, /\bcreateSvgArtifactProvenance\b/);
  assert.doesNotMatch(renderSvgSource, /\bnode:crypto\b/);
  assert.doesNotMatch(renderSvgSource, /\bcreateHash\b/);
});
