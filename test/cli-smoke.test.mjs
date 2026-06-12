import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { getDiagramPilotVersion } from "../packages/core/dist/index.js";
import {
  assertCliSuccess,
  assertCliFailure,
  assertCliSucceeded,
  assertLlmsPublicDocsLinks,
  groupedCheckoutArchitectureSourceText,
  occurrenceCount,
  readAgentSupportFiles,
  runBuiltCli,
  runDiagramPilot,
  sha256Hex,
  withTempRepo,
  writeCheckoutArchitectureSource,
} from "./cli-smoke-helpers.mjs";

test("diagrampilot executable starts and reports its version", async () => {
  const result = await runDiagramPilot(["--version"]);

  assertCliSuccess(result, {
    stdout: `diagrampilot ${getDiagramPilotVersion()}\n`,
  });
});

test("diagrampilot init does not install local agent docs by default", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init"], tempRoot);

    assertCliSucceeded(result);
    assert.match(result.stdout, /Local agent docs were not installed/);
    assert.match(result.stdout, /Run `diagrampilot init --docs`/);
    assert.deepEqual(await readdir(tempRoot), []);
  });
});

test("diagrampilot init --docs creates adoption support files without generating diagrams", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init", "--docs"], tempRoot);

    assertCliSucceeded(result);
    assert.match(result.stdout, /Created llms\.txt/);
    assert.match(result.stdout, /Created docs\/diagrampilot\.md/);

    const { llmsText, guideText } = await readAgentSupportFiles(tempRoot);

    assertLlmsPublicDocsLinks(llmsText);
    assert.match(llmsText, /read-only repo review\/CI command/);
    assert.match(
      llmsText,
      /diagrampilot validate docs\/architecture\.dp\.yaml/,
    );
    assert.match(
      llmsText,
      /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
    );
    assert.match(guideText, /DiagramSpec is the source of truth/);
    assert.match(guideText, /diagrampilot check/);
    assert.match(guideText, /read-only repo review\/CI command/);
    assert.match(
      guideText,
      /diagrampilot validate docs\/architecture\.dp\.yaml/,
    );
    assert.match(
      guideText,
      /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
    );
    assert.deepEqual((await readdir(tempRoot)).sort(), ["docs", "llms.txt"]);
    assert.deepEqual(
      (await readdir(path.join(tempRoot, "docs"))).sort(),
      ["diagrampilot.md"],
    );
  });
});

test("diagrampilot init --config creates a minimal Repo Workflow Configuration", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init", "--config"], tempRoot);

    assertCliSucceeded(result);
    assert.match(result.stdout, /Created diagrampilot\.config\.yaml/);

    const configText = await readFile(
      path.join(tempRoot, "diagrampilot.config.yaml"),
      "utf8",
    );

    assert.equal(configText, "version: 1\n");
    assert.deepEqual(await readdir(tempRoot), ["diagrampilot.config.yaml"]);
  });
});

test("diagrampilot init --config fails repairably when config already exists", async () => {
  await withTempRepo(async (tempRoot) => {
    const configPath = path.join(tempRoot, "diagrampilot.config.yaml");

    await writeFile(configPath, "version: 1\nsources:\n  ignore: []\n", "utf8");

    const result = await runBuiltCli(["init", "--config"], tempRoot);

    assertCliFailure(result, {
      stderrPatterns: [
        /Repo Workflow Configuration already exists/,
        /diagrampilot\.config\.yaml/,
        /Suggestion:/,
      ],
    });
    assert.equal(
      await readFile(configPath, "utf8"),
      "version: 1\nsources:\n  ignore: []\n",
    );
  });
});

test("diagrampilot init --docs preserves existing support-file content and is idempotent", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "llms.txt"),
      "# Existing Agent Notes\n\nKeep this project-specific guidance.\n",
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "diagrampilot.md"),
      "# Local Diagram Notes\n\nKeep this local rendering convention.\n",
      "utf8",
    );

    const firstRun = await runBuiltCli(["init", "--docs"], tempRoot);
    const secondRun = await runBuiltCli(["init", "--docs"], tempRoot);

    assert.equal(firstRun.code, 0, firstRun.stderr);
    assert.equal(secondRun.code, 0, secondRun.stderr);
    assert.equal(firstRun.stderr, "");
    assert.equal(secondRun.stderr, "");

    const { llmsText, guideText } = await readAgentSupportFiles(tempRoot);

    assert.match(llmsText, /Keep this project-specific guidance/);
    assert.match(guideText, /Keep this local rendering convention/);
    assert.equal(occurrenceCount(llmsText, /diagrampilot:init:start/g), 1);
    assert.equal(occurrenceCount(guideText, /diagrampilot:init:start/g), 1);
  });
});

test("diagrampilot init rejects unknown options without writing support files", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init", "--doc"], tempRoot);

    assertCliFailure(result, {
      stderrPatterns: [
        /Unknown init option: --doc/,
        /Usage: diagrampilot init \[--docs\]/,
      ],
    });
    assert.deepEqual(await readdir(tempRoot), []);
  });
});

test("diagrampilot create writes a valid template source and refuses overwrite", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "login-flow.dp.yaml");

    const createResult = await runBuiltCli(
      ["create", "docs/login-flow.dp.yaml", "--template", "flow"],
      tempRoot,
    );

    assertCliSucceeded(createResult);
    assert.match(
      createResult.stdout,
      /Created docs\/login-flow\.dp\.yaml from flow template\./,
    );
    assert.match(
      createResult.stdout,
      /diagrampilot validate docs\/login-flow\.dp\.yaml/,
    );
    assert.match(
      createResult.stdout,
      /diagrampilot render docs\/login-flow\.dp\.yaml --out docs\/login-flow\.svg/,
    );

    const sourceText = await readFile(sourcePath, "utf8");

    assert.match(sourceText, /title: Starter Flow/);
    assert.match(sourceText, /id: decision_point/);

    const validateResult = await runBuiltCli(
      ["validate", "docs/login-flow.dp.yaml"],
      tempRoot,
    );

    assertCliSuccess(validateResult, {
      stdout: "Valid docs/login-flow.dp.yaml\n",
    });

    const overwriteResult = await runBuiltCli(
      ["create", "docs/login-flow.dp.yaml", "--template", "flow"],
      tempRoot,
    );

    assertCliFailure(overwriteResult, {
      stderrPatterns: [
        /DiagramPilot Source File already exists: docs\/login-flow\.dp\.yaml/,
        /Suggestion: choose a new path/,
      ],
    });
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
  });
});

test(
  "diagrampilot init does not scan repository contents",
  { skip: process.platform === "win32" },
  async () => {
    await withTempRepo(async (tempRoot) => {
      const unreadableDir = path.join(tempRoot, "src", "private");
      await mkdir(unreadableDir, { recursive: true });
      await writeFile(
        path.join(tempRoot, "src", "broken.dp.yaml"),
        "this is not valid: [",
        "utf8",
      );
      await chmod(unreadableDir, 0o000);

      try {
        const result = await runBuiltCli(["init"], tempRoot);

        assert.equal(result.signal, null);
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.stderr, "");
        assert.doesNotMatch(result.stdout, /broken\.dp\.yaml/);
        assert.doesNotMatch(result.stdout, /src\/private/);
      } finally {
        await chmod(unreadableDir, 0o700);
      }
    });
  },
);

test("diagrampilot validate reads a YAML source file from an explicit path", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
      [
        "version: 1",
        "title: Checkout Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/architecture.dp.yaml"],
      tempRoot,
    );

    assertCliSuccess(result, { stdout: "Valid docs/architecture.dp.yaml\n" });
  });
});

test("diagrampilot validate rejects a non-YAML source path generically", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "architecture.dp.json"),
      JSON.stringify(
        {
          version: 1,
          title: "Checkout Architecture",
          nodes: [{ id: "web_app", label: "Web App" }],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/architecture.dp.json"],
      tempRoot,
    );

    assertCliFailure(result, {
      stderrPatterns: [
        /Unsupported DiagramPilot source file: docs\/architecture\.dp\.json/,
      ],
    });
    assert.doesNotMatch(result.stderr, /YAML is the supported source format/);
  });
});

test("diagrampilot lint reports readability warnings without writing files", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, sourceText } =
      await writeCheckoutArchitectureSource(tempRoot);

    const result = await runBuiltCli(
      ["lint", "docs/architecture.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.file, "docs/architecture.dp.yaml");
    assert.equal(payload.ok, false);
    assert.deepEqual(payload.errors, []);
    assert.equal(payload.summary.warningCount, 1);
    assert.equal(payload.warnings[0].ruleId, "missing-edge-kind");
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
    assert.deepEqual(await readdir(path.join(tempRoot, "docs")), [
      "architecture.dp.yaml",
    ]);
  });
});

test("diagrampilot export prints Mermaid for a valid DiagramSpec", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, sourceText } =
      await writeCheckoutArchitectureSource(tempRoot);

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    assertCliSuccess(result, {
      stdout: [
        "flowchart LR",
        "  web_app[\"Web App\"]",
        "  api_gateway[\"API Gateway\"]",
        "  web_app -->|HTTPS| api_gateway",
        "",
      ].join("\n"),
    });
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
  });
});

test("diagrampilot export prints DOT for a valid DiagramSpec", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, sourceText } = await writeCheckoutArchitectureSource(
      tempRoot,
      groupedCheckoutArchitectureSourceText,
    );

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "dot"],
      tempRoot,
    );

    assertCliSucceeded(result);
    assert.match(result.stdout, /^digraph "Checkout Architecture"/);
    assert.match(result.stdout, /subgraph "cluster_frontend"/);
    assert.match(result.stdout, /"web_app" -> "api_gateway" \[dir=none\];/);
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
  });
});

test("diagrampilot render writes SVG with deterministic provenance", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourceText = [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "  - id: api_gateway",
      "    label: API Gateway",
      "edges:",
      "  - id: web_app_to_api_gateway",
      "    from: web_app",
      "    to: api_gateway",
      "    label: HTTPS",
      "",
    ].join("\n");

    await writeFile(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
      sourceText,
      "utf8",
    );

    const result = await runBuiltCli(
      [
        "render",
        "docs/architecture.dp.yaml",
        "--out",
        "docs/architecture.svg",
      ],
      tempRoot,
    );
    const renderedSvg = await readFile(
      path.join(tempRoot, "docs", "architecture.svg"),
      "utf8",
    );
    const provenanceMatch = /<metadata id="diagrampilot-provenance">(?<json>.*?)<\/metadata>/s.exec(
      renderedSvg,
    );

    assertCliSuccess(result);
    assert.match(renderedSvg, /<svg\b/);
    assert.match(renderedSvg, /Web App/);
    assert.match(renderedSvg, /API Gateway/);
    assert.match(renderedSvg, /HTTPS/);
    assert.notEqual(provenanceMatch, null);

    assert.deepEqual(JSON.parse(provenanceMatch.groups.json), {
      sourcePath: "docs/architecture.dp.yaml",
      sourceSha256: sha256Hex(sourceText),
      diagramPilotVersion: getDiagramPilotVersion(),
      renderer: {
        name: "@terrastruct/d2",
        version: "0.1.33",
      },
    });
    assert.doesNotMatch(renderedSvg, /timestamp|renderedAt|createdAt|date/iu);
  });
});

test("diagrampilot render writes a valid non-empty PNG", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourceText } = await writeCheckoutArchitectureSource(tempRoot);

    const result = await runBuiltCli(
      [
        "render",
        "docs/architecture.dp.yaml",
        "--format",
        "png",
        "--out",
        "docs/architecture.png",
      ],
      tempRoot,
    );
    const pngBytes = await readFile(
      path.join(tempRoot, "docs", "architecture.png"),
    );

    assertCliSuccess(result);
    assert.ok(pngBytes.length > 8);
    assert.deepEqual([...pngBytes.subarray(0, 8)], [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
