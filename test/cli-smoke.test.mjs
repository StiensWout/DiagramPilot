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

test("diagrampilot executable starts and reports its version", async () => {
  const result = await runDiagramPilot(["--version"]);

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, "diagrampilot 0.1.0\n");
});

test("diagrampilot init creates adoption support files without generating diagrams", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(["init"], tempRoot);

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
    assert.match(guideText, /DiagramSpec is the source of truth/);
    assert.deepEqual((await readdir(tempRoot)).sort(), ["docs", "llms.txt"]);
    assert.deepEqual(
      (await readdir(path.join(tempRoot, "docs"))).sort(),
      ["diagrampilot.md"],
    );
  });
});

test("diagrampilot init preserves existing support-file content and is idempotent", async () => {
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

    const firstRun = await runBuiltCli(["init"], tempRoot);
    const secondRun = await runBuiltCli(["init"], tempRoot);

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
      diagramPilotVersion: "0.1.0",
      renderer: {
        name: "@terrastruct/d2",
        version: "0.1.33",
      },
    });
    assert.doesNotMatch(renderedSvg, /timestamp|renderedAt|createdAt|date/iu);
  });
});
