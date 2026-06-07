import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getDiagramPilotVersion } from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntryPoint = path.join(repoRoot, "packages", "cli", "dist", "index.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function testEnv() {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return env;
}

function runDiagramPilot(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      npmCommand,
      ["exec", "--workspace", "diagrampilot", "--", "diagrampilot", ...args],
      {
        cwd: repoRoot,
        env: testEnv(),
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function runBuiltCli(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntryPoint, ...args], {
      cwd,
      env: testEnv(),
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-cli-"));

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function occurrenceCount(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function writeFreshDiagramArtifact(tempRoot) {
  await mkdir(path.join(tempRoot, "docs"), { recursive: true });
  const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
  const sourceText = [
    "version: 1",
    "title: Checkout Architecture",
    "nodes:",
    "  - id: web_app",
    "    label: Web App",
    "",
  ].join("\n");

  await writeFile(sourcePath, sourceText, "utf8");
  await writeFile(
    path.join(tempRoot, "docs", "architecture.svg"),
    addSvgProvenanceMetadata(
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
      createSvgRendererProvenance({
        sourcePath: "docs/architecture.dp.yaml",
        sourceContent: sourceText,
      }),
    ),
    "utf8",
  );

  return { sourcePath, sourceText };
}

test("diagrampilot executable starts and reports its version", async () => {
  const result = await runDiagramPilot(["--version"]);

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, `diagrampilot ${getDiagramPilotVersion()}\n`);
});

test("diagrampilot init does not install local agent docs by default", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /Local agent docs were not installed/);
    assert.match(result.stdout, /Run `diagrampilot init --docs`/);
    assert.deepEqual(await readdir(tempRoot), []);
  });
});

test("diagrampilot init --docs creates adoption support files without generating diagrams", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init", "--docs"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /Created llms\.txt/);
    assert.match(result.stdout, /Created docs\/diagrampilot\.md/);

    const llmsText = await readFile(path.join(tempRoot, "llms.txt"), "utf8");
    const guideText = await readFile(
      path.join(tempRoot, "docs", "diagrampilot.md"),
      "utf8",
    );

    assert.match(llmsText, /https:\/\/diagrampilot\.com\/llms\.txt/);
    assert.match(llmsText, /diagrampilot check/);
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

    const llmsText = await readFile(path.join(tempRoot, "llms.txt"), "utf8");
    const guideText = await readFile(
      path.join(tempRoot, "docs", "diagrampilot.md"),
      "utf8",
    );

    assert.match(llmsText, /Keep this project-specific guidance/);
    assert.match(guideText, /Keep this local rendering convention/);
    assert.equal(occurrenceCount(llmsText, /diagrampilot:init:start/g), 1);
    assert.equal(occurrenceCount(guideText, /diagrampilot:init:start/g), 1);
  });
});

test("diagrampilot init rejects unknown options without writing support files", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init", "--doc"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Unknown init option: --doc/);
    assert.match(result.stderr, /Usage: diagrampilot init \[--docs\]/);
    assert.deepEqual(await readdir(tempRoot), []);
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

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/architecture.dp.yaml\n");
  });
});

test("diagrampilot validate rejects a legacy JSON source with a YAML repair hint", async () => {
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

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /Unsupported DiagramPilot source file: docs\/architecture\.dp\.json/,
    );
    assert.match(result.stderr, /YAML is the supported source format/);
    assert.match(result.stderr, /\*\.dp\.yaml/);
  });
});

test("diagrampilot export prints Mermaid for a valid DiagramSpec", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
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

    await writeFile(sourcePath, sourceText, "utf8");

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, [
      "flowchart LR",
      "  web_app[\"Web App\"]",
      "  api_gateway[\"API Gateway\"]",
      "  web_app -->|HTTPS| api_gateway",
      "",
    ].join("\n"));
    assert.equal(await readFile(sourcePath, "utf8"), sourceText);
  });
});

test("diagrampilot export prints DOT for a valid DiagramSpec", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const sourceText = [
      "version: 1",
      "title: Checkout Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "  - id: api_gateway",
      "    label: API Gateway",
      "groups:",
      "  - id: frontend",
      "    label: Frontend",
      "    contains:",
      "      - web_app",
      "edges:",
      "  - id: web_app_to_api_gateway",
      "    from: web_app",
      "    to: api_gateway",
      "    directed: false",
      "",
    ].join("\n");

    await writeFile(sourcePath, sourceText, "utf8");

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "dot"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
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

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
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
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
      [
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
      ].join("\n"),
      "utf8",
    );

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

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.ok(pngBytes.length > 8);
    assert.deepEqual([...pngBytes.subarray(0, 8)], [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});

test("diagrampilot check uses the current working directory by default", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(["check"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    );
  });
});

test("diagrampilot check supports an explicit directory scope with aggregate json output", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(["check", ".", "--json"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");

    const payload = JSON.parse(result.stdout);

    assert.equal(payload.ok, true);
    assert.deepEqual(payload.scope, {
      kind: "directory",
      path: ".",
    });
    assert.deepEqual(payload.summary, {
      checkedSourceCount: 1,
      freshSourceCount: 1,
      issueCount: 0,
    });
    assert.equal(payload.sources.length, 1);
    assert.equal(payload.sources[0].sourcePath, "docs/architecture.dp.yaml");
    assert.equal(payload.sources[0].artifact.status, "fresh");
    assert.equal(payload.sources[0].artifact.path, "docs/architecture.svg");
  });
});

test("diagrampilot check supports one explicit source file", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeFreshDiagramArtifact(tempRoot);

    const result = await runBuiltCli(
      ["check", "docs/architecture.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
    );
  });
});
