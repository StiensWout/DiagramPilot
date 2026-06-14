import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./website-test-helpers.mjs";

const removedTimingScriptName = ["bench", "mark"].join("");
const removedTimingTestName = ["bench", "mark-workflows.test.mjs"].join("");

test("root test scripts split serial shared-output tests from concurrent tests", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const runner = await readFile(
    path.join(repoRoot, "scripts", "run-root-tests.mjs"),
    "utf8",
  );
  const fallowConfig = await readFile(
    path.join(repoRoot, ".fallowrc.jsonc"),
    "utf8",
  );

  assert.equal(packageJson.scripts.test, "npm run build && npm run test:root");
  assert.equal(
    packageJson.scripts["test:root:parallel"],
    "node scripts/run-root-tests.mjs --group parallel",
  );
  assert.equal(
    packageJson.scripts["test:root:shared"],
    "node scripts/run-root-tests.mjs --group shared",
  );
  assert.equal(
    packageJson.scripts["test:root:ci"],
    "node scripts/run-root-tests.mjs --group ci",
  );
  assert.doesNotMatch(packageJson.scripts.test, /--test-concurrency=1 test\/\*\.test\.mjs/u);
  assert.equal(packageJson.scripts[removedTimingScriptName], undefined);
  assert.match(runner, /const parallelConcurrency = 8/u);
  assert.equal(runner.includes(removedTimingTestName), false);
  assert.match(runner, /"checkout-demo-project\.test\.mjs"/u);
  assert.match(runner, /function isWebsiteTest/u);
  assert.match(fallowConfig, /"test\/\*\*\/\*\.test\.mjs"/u);
});
