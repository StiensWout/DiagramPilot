import test from "node:test";

import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";
import { repoRoot } from "./website-test-helpers.mjs";

test("package size budget check passes for current public package tarballs", async () => {
  const result = await runProcess(
    process.execPath,
    ["scripts/check-package-size-budgets.mjs"],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv(),
    },
  );

  assertProcessSuccess(result, {
    stdout: "DiagramPilot package size budgets passed for 8 public packages.\n",
  });
});
