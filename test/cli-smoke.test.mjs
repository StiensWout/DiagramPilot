import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-init-"));

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function occurrenceCount(text, pattern) {
  return text.match(pattern)?.length ?? 0;
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

    const rootEntries = await readdir(tempRoot);
    const docsEntries = await readdir(path.join(tempRoot, "docs"));

    assert.deepEqual(rootEntries.sort(), ["docs", "llms.txt"]);
    assert.deepEqual(docsEntries.sort(), ["diagrampilot.md"]);
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
    assert.equal(
      occurrenceCount(llmsText, /https:\/\/diagrampilot\.com\/llms\.txt/g),
      1,
    );
    assert.equal(
      occurrenceCount(guideText, /DiagramSpec is the source of truth/g),
      1,
    );
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

test("diagrampilot validate reads a JSON source file from an explicit path", async () => {
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
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/architecture.dp.json\n");
  });
});

test("diagrampilot validate rejects a missing required top-level field", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "missing-title.dp.yaml"),
      [
        "version: 1",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/missing-title.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/missing-title\.dp\.yaml: Missing required top-level field: title\./,
    );
    assert.match(
      result.stderr,
      /Required top-level fields: version, title, nodes\./,
    );
  });
});

test("diagrampilot validate rejects an empty nodes collection", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "empty.dp.yaml"),
      [
        "version: 1",
        "title: Empty Architecture",
        "nodes: []",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(["validate", "docs/empty.dp.yaml"], tempRoot);

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/empty\.dp\.yaml: nodes must contain at least one node\./,
    );
    assert.match(result.stderr, /Add at least one node to nodes\./);
  });
});

test("diagrampilot validate rejects an invalid top-level direction", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-direction.dp.yaml"),
      [
        "version: 1",
        "title: Bad Direction Architecture",
        "direction: sideways",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-direction.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/bad-direction\.dp\.yaml: direction must be one of: right, left, down, up\./,
    );
    assert.match(result.stderr, /Change direction to right, left, down, or up\./);
  });
});

test("diagrampilot validate stops at a YAML parse failure", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "broken.dp.yaml"),
      [
        "version: 1",
        "title: Broken Source",
        "nodes: [",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/broken.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^YAML parse error in docs\/broken\.dp\.yaml/);
    assert.doesNotMatch(result.stderr, /Missing required top-level field/);
    assert.doesNotMatch(result.stderr, /Required top-level fields/);
  });
});

test("diagrampilot validate stops at a JSON parse failure", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "broken.dp.json"),
      [
        "{",
        '  "version": 1,',
        '  "title": "Broken Source",',
        '  "nodes": [',
        '    { "id": "web_app", "label": "Web App" },',
        "  ]",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/broken.dp.json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^JSON parse error in docs\/broken\.dp\.json/);
    assert.doesNotMatch(result.stderr, /Missing required top-level field/);
    assert.doesNotMatch(result.stderr, /Required top-level fields/);
  });
});
