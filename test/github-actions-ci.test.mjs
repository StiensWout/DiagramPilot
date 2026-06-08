import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "ci.yml");

async function readWorkflow() {
  return readFile(workflowPath, "utf8");
}

function assertIncludesAll(source, snippets) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `CI workflow should include: ${snippet}`);
  }
}

test("GitHub Actions CI validates branch and pull request release-readiness gates", async () => {
  const workflow = await readWorkflow();

  assertIncludesAll(workflow, [
    "name: CI",
    "pull_request:",
    "push:",
    "branches:",
    "main",
    "issue-*",
    "Fallow changed-code audit",
    "if: github.event_name == 'pull_request'",
    "fetch-depth: 0",
    "FALLOW_UPDATE_CHECK: \"off\"",
    "uses: fallow-rs/fallow@v2.89.0",
    "command: audit",
    "version: 2.89.0",
    "fail-on-issues: false",
    "annotations: true",
    "uses: actions/checkout@v4",
    "uses: actions/setup-node@v4",
    "node-version: 22",
    "cache: npm",
    "npm install --global npm@11.16.0",
    "npm ci",
    "npm run check:release-version",
    "npm run build",
    "npm test",
    "npm run generate:schema",
    "git diff --exit-code -- schema/diagramspec-v1.schema.json",
    "npm --workspace website run build",
    "npm --workspace website run test",
    "node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg",
    "node ../../packages/cli/dist/index.js check",
    "git diff --exit-code -- demo-projects/checkout/docs/architecture.svg",
    "npm run check:package-readiness",
  ]);

  assert.doesNotMatch(workflow, /NPM_TOKEN|VERCEL|npm publish/u);
  assert.doesNotMatch(workflow, /check:visual|playwright install/u);
});
