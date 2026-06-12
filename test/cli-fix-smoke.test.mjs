import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertCliSucceeded,
  assertCliSuccess,
  runBuiltCli,
  sha256Hex,
  withTempRepo,
} from "./cli-smoke-helpers.mjs";
import { writeDiagramSource } from "./diagramspec-loading-helpers.mjs";

test("diagrampilot fix plans in JSON mode and mutates only the source file", async () => {
  await withTempRepo(async (tempRoot) => {
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");
    const sourceText = [
      "title: Checkout Architecture",
      "version: 1",
      "nodes: [{ id: web_app, label: Web App }]",
      "",
    ].join("\n");
    const artifactText = "<svg><text>do not touch</text></svg>\n";
    const sourcePath = await writeDiagramSource(
      tempRoot,
      "architecture.dp.yaml",
      sourceText.split("\n"),
    );

    await writeFile(artifactPath, artifactText, "utf8");

    const planResult = await runBuiltCli(
      ["fix", "docs/architecture.dp.yaml", "--json"],
      tempRoot,
    );

    assertCliSucceeded(planResult);
    assert.equal(planResult.stderr, "");
    assert.deepEqual(JSON.parse(planResult.stdout), {
      file: "docs/architecture.dp.yaml",
      ok: true,
      changed: true,
      repairs: [
        {
          kind: "format-source",
          path: "$",
          message: "Format source as canonical DiagramPilot YAML.",
        },
      ],
      validation: {
        ok: true,
        errors: [],
      },
    });
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
    const artifactHash = sha256Hex(await readFile(artifactPath, "utf8"));

    const fixResult = await runBuiltCli(["fix", "docs/architecture.dp.yaml"], tempRoot);

    assertCliSuccess(fixResult, {
      stdout: "Fixed docs/architecture.dp.yaml with 1 deterministic repair.\n",
    });
    assert.equal(
      await readFile(sourcePath, "utf8"),
      [
        "version: 1",
        "title: Checkout Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
    );
    assert.equal(sha256Hex(await readFile(artifactPath, "utf8")), artifactHash);
  });
});
