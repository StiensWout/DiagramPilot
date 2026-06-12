import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

async function readPublicDoc(relativePath) {
  return readFile(path.join(repoRoot, "docs-public", relativePath), "utf8");
}

test("public docs show focused render examples for groups neighborhoods and overviews", async () => {
  const quickstart = await readPublicDoc("agents/quickstart.md");
  const docsIndex = await readPublicDoc("index.md");

  for (const publicDoc of [quickstart, docsIndex]) {
    assert.match(
      publicDoc,
      /diagrampilot render docs\/architecture\.dp\.yaml --group checkout_runtime --out docs\/architecture-checkout-runtime\.svg/,
    );
    assert.match(
      publicDoc,
      /diagrampilot render docs\/architecture\.dp\.yaml --around orders_service --depth 1 --out docs\/architecture-orders-service\.svg/,
    );
    assert.match(
      publicDoc,
      /diagrampilot render docs\/architecture\.dp\.yaml --hide-edge-labels --out docs\/architecture-overview\.svg/,
    );
  }
});
