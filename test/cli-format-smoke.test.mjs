import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertCliFailure,
  assertCliSuccess,
  runBuiltCli,
  sha256Hex,
  withTempRepo,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot format rewrites valid sources canonically and is idempotent", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");

    await writeFile(
      sourcePath,
      [
        "# This comment is not preserved in 0.4.0.",
        "nodes:",
        "  - label: API",
        "    id: api",
        "  - metadata:",
        "      owner: web",
        "    label: Web App",
        "    id: web_app",
        "    kind: frontend",
        "metadata:",
        "  z: last",
        "  a: first",
        "title: Checkout Architecture",
        "version: 1",
        "edges:",
        "  - to: api",
        "    id: web_app_to_api",
        "    label: HTTPS",
        "    directed: false",
        "    from: web_app",
        "groups:",
        "  - label: Clients",
        "    id: clients",
        "    contains:",
        "      - web_app",
        "",
      ].join("\n"),
      "utf8",
    );

    const firstResult = await runBuiltCli(
      ["format", "docs/architecture.dp.yaml"],
      tempRoot,
    );
    const formatted = await readFile(sourcePath, "utf8");
    const formattedHash = sha256Hex(formatted);

    assertCliSuccess(firstResult);
    assert.equal(
      formatted,
      [
        "version: 1",
        "title: Checkout Architecture",
        "nodes:",
        "  - id: api",
        "    label: API",
        "  - id: web_app",
        "    label: Web App",
        "    kind: frontend",
        "    metadata:",
        "      owner: web",
        "groups:",
        "  - id: clients",
        "    label: Clients",
        "    contains:",
        "      - web_app",
        "edges:",
        "  - id: web_app_to_api",
        "    from: web_app",
        "    to: api",
        "    label: HTTPS",
        "    directed: false",
        "metadata:",
        "  z: last",
        "  a: first",
        "",
      ].join("\n"),
    );
    assert.doesNotMatch(formatted, /not preserved/);

    const secondResult = await runBuiltCli(
      ["format", "docs/architecture.dp.yaml"],
      tempRoot,
    );

    assertCliSuccess(secondResult);
    assert.equal(sha256Hex(await readFile(sourcePath, "utf8")), formattedHash);
  });
});

test("diagrampilot format refuses invalid sources without rewriting them", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const sourceText = [
      "version: 1",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n");

    await writeFile(sourcePath, sourceText, "utf8");

    const result = await runBuiltCli(
      ["format", "docs/architecture.dp.yaml"],
      tempRoot,
    );

    assertCliFailure(result, {
      stderrPatterns: [
        /DiagramSpec validation error in docs\/architecture\.dp\.yaml/,
        /Missing required top-level field: title/,
        /Suggestion:/,
      ],
    });
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
  });
});
