import assert from "node:assert/strict";
import test from "node:test";

import {
  groupedCheckoutArchitectureSourceText,
  runBuiltCli,
  withTempRepo,
  writeCheckoutArchitectureSource,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot inspect reports inventory from the current working directory", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeCheckoutArchitectureSource(
      tempRoot,
      groupedCheckoutArchitectureSourceText,
    );

    const result = await runBuiltCli(["inspect"], tempRoot);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(
      result.stdout,
      /^Found 1 DiagramPilot Source File in .* 1 artifact issue\./,
    );
    assert.match(result.stdout, /docs\/architecture\.dp\.yaml/);
    assert.match(result.stdout, /title: Checkout Architecture/);
    assert.match(result.stdout, /Stable IDs: nodes=web_app, api_gateway/);
    assert.match(result.stdout, /artifacts: svg docs\/architecture\.svg missing-artifact/);
  });
});

test("diagrampilot inspect --json emits stable agent inventory", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeCheckoutArchitectureSource(
      tempRoot,
      groupedCheckoutArchitectureSourceText,
    );

    const result = await runBuiltCli(["inspect", "--json"], tempRoot);
    const payload = JSON.parse(result.stdout);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.summary, {
      discoveredSourceCount: 1,
      validSourceCount: 1,
      invalidSourceCount: 0,
      artifactExpectationCount: 1,
      artifactIssueCount: 1,
    });
    assert.equal(payload.sources[0].diagram.title, "Checkout Architecture");
    assert.deepEqual(payload.sources[0].diagram.counts, {
      nodes: 2,
      edges: 1,
      groups: 1,
    });
    assert.deepEqual(payload.sources[0].artifacts, [
      {
        format: "svg",
        status: "missing-artifact",
        path: "docs/architecture.svg",
      },
    ]);
  });
});
