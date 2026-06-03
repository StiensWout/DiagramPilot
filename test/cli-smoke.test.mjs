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

test("diagrampilot validate --json emits a structured valid result on stdout", async () => {
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
      ["validate", "docs/architecture.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /^Valid /);
    assert.deepEqual(JSON.parse(result.stdout), {
      file: "docs/architecture.dp.yaml",
      ok: true,
      errors: [],
    });
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

test("diagrampilot validate emits repairable validation errors in text mode", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "repairable-errors.dp.yaml"),
      [
        "version: 1",
        "title: Repairable Error Architecture",
        "direction: sideways",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: ghost_client_to_api_gateway",
        "    from: ghost_client",
        "    to: api_gateway",
        "    directed: sometimes",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/repairable-errors.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/repairable-errors\.dp\.yaml:/,
    );
    assert.match(result.stderr, /Path: direction/);
    assert.match(
      result.stderr,
      /Problem: direction must be one of: right, left, down, up\./,
    );
    assert.match(result.stderr, /Bad value: "sideways"/);
    assert.match(result.stderr, /Expected: One of: right, left, down, up\./);
    assert.match(
      result.stderr,
      /Suggestion: Change direction to right, left, down, or up\./,
    );
    assert.match(result.stderr, /Path: edges\[0\]\.from/);
    assert.match(result.stderr, /Bad value: "ghost_client"/);
    assert.match(
      result.stderr,
      /Suggestion: Add a node with id "ghost_client" or change edges\[0\]\.from to an existing node ID\./,
    );
    assert.match(result.stderr, /Path: edges\[0\]\.directed/);
    assert.match(result.stderr, /Bad value: "sometimes"/);
    assert.match(result.stderr, /Expected: Boolean true or false\./);
  });
});

test("diagrampilot validate --json emits structured repairable validation errors on stdout", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "repairable-errors.dp.yaml"),
      [
        "version: 1",
        "title: Repairable Error Architecture",
        "direction: sideways",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: ghost_client_to_api_gateway",
        "    from: ghost_client",
        "    to: api_gateway",
        "    directed: sometimes",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/repairable-errors.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /DiagramSpec validation error in/);
    assert.doesNotMatch(result.stdout, /Path:/);
    assert.doesNotMatch(result.stdout, /Suggestion:/);

    const validationResult = JSON.parse(result.stdout);

    assert.deepEqual(validationResult, {
      file: "docs/repairable-errors.dp.yaml",
      ok: false,
      errors: [
        {
          path: "direction",
          message: "direction must be one of: right, left, down, up.",
          badValue: "sideways",
          expected: "One of: right, left, down, up.",
          suggestion: "Change direction to right, left, down, or up.",
        },
        {
          path: "edges[0].from",
          message: 'edges[0].from references unknown node "ghost_client".',
          badValue: "ghost_client",
          expected: "One of: api_gateway.",
          suggestion:
            'Add a node with id "ghost_client" or change edges[0].from to an existing node ID.',
        },
        {
          path: "edges[0].directed",
          message: "edges[0].directed must be a boolean when present.",
          badValue: "sometimes",
          expected: "Boolean true or false.",
          suggestion:
            "Use true for directed edges or false for undirected edges.",
        },
      ],
    });
  });
});

test("diagrampilot validate --json emits read diagnostics only on stdout", async () => {
  await withTempRepo(async (tempRoot) => {
    const result = await runBuiltCli(
      ["validate", "docs/missing.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");

    const validationResult = JSON.parse(result.stdout);

    assert.equal(validationResult.file, "docs/missing.dp.yaml");
    assert.equal(validationResult.ok, false);
    assert.equal(validationResult.errors.length, 1);
    assert.deepEqual(
      {
        path: validationResult.errors[0].path,
        expected: validationResult.errors[0].expected,
        suggestion: validationResult.errors[0].suggestion,
      },
      {
        path: "$",
        expected: "Readable DiagramPilot Source File.",
        suggestion: "Check that the source path exists and is readable.",
      },
    );
    assert.match(
      validationResult.errors[0].message,
      /^Unable to read docs\/missing\.dp\.yaml: /,
    );
  });
});

test("diagrampilot validate --json emits parse diagnostics only on stdout", async () => {
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
      ["validate", "docs/broken.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(
      result.stdout,
      /YAML parse error in docs\/broken\.dp\.yaml/,
    );

    const validationResult = JSON.parse(result.stdout);

    assert.equal(validationResult.file, "docs/broken.dp.yaml");
    assert.equal(validationResult.ok, false);
    assert.deepEqual(
      {
        path: validationResult.errors[0].path,
        expected: validationResult.errors[0].expected,
        suggestion: validationResult.errors[0].suggestion,
      },
      {
        path: "$",
        expected: "Valid YAML DiagramPilot Source File syntax.",
        suggestion: "Fix the YAML syntax before semantic validation.",
      },
    );
    assert.match(validationResult.errors[0].message, /^YAML parse error/);
  });
});

test("diagrampilot validate rejects an invalid stable ID shape", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-id.dp.yaml"),
      [
        "version: 1",
        "title: Bad ID Architecture",
        "nodes:",
        "  - id: API Gateway",
        "    label: API Gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-id.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/bad-id\.dp\.yaml: nodes\[0\]\.id must match the stable ID pattern\./,
    );
    assert.match(
      result.stderr,
      /\^\[a-z\]\[a-z0-9\]\*\(\?:_\[a-z0-9\]\+\)\*\$/,
    );
    assert.match(result.stderr, /Change nodes\[0\]\.id to lowercase snake case/);
  });
});

test("diagrampilot validate rejects missing stable IDs across diagram objects", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "missing-ids.dp.yaml"),
      [
        "version: 1",
        "title: Missing IDs Architecture",
        "nodes:",
        "  - label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - from: api_gateway",
        "    to: api_gateway",
        "groups:",
        "  - label: Backend Services",
        "    contains:",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/missing-ids.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /nodes\[0\]\.id must match the stable ID pattern/);
    assert.match(result.stderr, /edges\[0\]\.id must match the stable ID pattern/);
    assert.match(
      result.stderr,
      /groups\[0\]\.id must match the stable ID pattern/,
    );
  });
});

test("diagrampilot validate rejects missing node and group labels", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "missing-labels.dp.yaml"),
      [
        "version: 1",
        "title: Missing Labels Architecture",
        "nodes:",
        "  - id: web_app",
        "  - id: api_gateway",
        "    label: API Gateway",
        "groups:",
        "  - id: backend_services",
        "    contains:",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/missing-labels.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /nodes\[0\]\.label is required\./);
    assert.match(result.stderr, /groups\[0\]\.label is required\./);
    assert.match(result.stderr, /Add a plain-text label to nodes\[0\]\./);
    assert.match(result.stderr, /Add a plain-text label to groups\[0\]\./);
  });
});

test("diagrampilot validate accepts multiline node and group labels", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "multiline-labels.dp.yaml"),
      [
        "version: 1",
        "title: Multiline Label Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: |-",
        "      Public Web",
        "      App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "groups:",
        "  - id: customer_entrypoints",
        "    label: |-",
        "      Customer",
        "      Entrypoints",
        "    contains:",
        "      - web_app",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/multiline-labels.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/multiline-labels.dp.yaml\n");
  });
});

test("diagrampilot validate accepts stable IDs across diagram objects", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "stable-ids.dp.yaml"),
      [
        "version: 1",
        "title: Stable ID Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    contains:",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/stable-ids.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/stable-ids.dp.yaml\n");
  });
});

test("diagrampilot validate treats kind as an open stable ID semantic tag", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "open-kind.dp.yaml"),
      [
        "version: 1",
        "title: Open Kind Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    kind: repo_gateway",
        "  - id: orders_service",
        "    label: Orders Service",
        "    kind: domain_service",
        "edges:",
        "  - id: api_gateway_to_orders_service",
        "    from: api_gateway",
        "    to: orders_service",
        "    kind: async_request",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    kind: bounded_context",
        "    contains:",
        "      - orders_service",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(tempRoot, "docs", "bad-kind.dp.yaml"),
      [
        "version: 1",
        "title: Bad Kind Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    kind: API Gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const validResult = await runBuiltCli(
      ["validate", "docs/open-kind.dp.yaml"],
      tempRoot,
    );
    const invalidResult = await runBuiltCli(
      ["validate", "docs/bad-kind.dp.yaml"],
      tempRoot,
    );

    assert.equal(validResult.signal, null);
    assert.equal(validResult.code, 0, validResult.stderr);
    assert.equal(validResult.stderr, "");
    assert.equal(validResult.stdout, "Valid docs/open-kind.dp.yaml\n");
    assert.equal(invalidResult.signal, null);
    assert.equal(invalidResult.code, 1);
    assert.equal(invalidResult.stdout, "");
    assert.match(
      invalidResult.stderr,
      /nodes\[0\]\.kind must match the stable ID pattern\./,
    );
    assert.match(
      invalidResult.stderr,
      /Change nodes\[0\]\.kind to lowercase snake case/,
    );
  });
});

test("diagrampilot validate rejects unknown Lucide icon references", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "unknown-lucide-icon.dp.yaml"),
      [
        "version: 1",
        "title: Unknown Lucide Icon Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    icon: lucide:not-a-real-icon",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/unknown-lucide-icon.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");

    assert.deepEqual(JSON.parse(result.stdout), {
      file: "docs/unknown-lucide-icon.dp.yaml",
      ok: false,
      errors: [
        {
          path: "nodes[0].icon",
          message:
            'nodes[0].icon references unknown Lucide icon "not-a-real-icon".',
          badValue: "lucide:not-a-real-icon",
          expected: "Known Lucide icon name.",
          suggestion:
            "Choose a packaged Lucide icon, such as lucide:database.",
        },
      ],
    });
  });
});

test("diagrampilot validate accepts packaged Lucide icon references", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "lucide-icons.dp.yaml"),
      [
        "version: 1",
        "title: Lucide Icon Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    icon: lucide:server",
        "  - id: orders_db",
        "    label: Orders DB",
        "    icon: lucide:database-backup",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    icon: lucide:blocks",
        "    contains:",
        "      - api_gateway",
        "      - orders_db",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/lucide-icons.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/lucide-icons.dp.yaml\n");
  });
});

test("diagrampilot validate rejects unsupported icon namespaces", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "unsupported-icon-namespace.dp.yaml"),
      [
        "version: 1",
        "title: Unsupported Icon Namespace Architecture",
        "nodes:",
        "  - id: queue_worker",
        "    label: Queue Worker",
        "    icon: aws:lambda",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/unsupported-icon-namespace.dp.yaml", "--json"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stderr, "");

    assert.deepEqual(JSON.parse(result.stdout), {
      file: "docs/unsupported-icon-namespace.dp.yaml",
      ok: false,
      errors: [
        {
          path: "nodes[0].icon",
          message: 'nodes[0].icon uses unsupported icon namespace "aws".',
          badValue: "aws:lambda",
          expected: "Supported icon namespaces: lucide.",
          suggestion:
            "Use lucide:<icon-name> with a packaged Lucide icon, such as lucide:database.",
        },
      ],
    });
  });
});

test("diagrampilot validate accepts valid metadata source and external references", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "metadata-references.dp.yaml"),
      [
        "version: 1",
        "title: Metadata References Architecture",
        "metadata:",
        "  source: docs/**/*.dp.yaml",
        "  external_url: https://example.com/architecture-notes",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    metadata:",
        "      source: packages/core/src/index.ts",
        "      external_url: https://example.com/api-gateway",
        "  - id: orders_service",
        "    label: Orders Service",
        "edges:",
        "  - id: api_gateway_to_orders_service",
        "    from: api_gateway",
        "    to: orders_service",
        "    metadata:",
        "      source: packages/*/src/**/*.ts",
        "      external_url: http://example.com/service-contract",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    contains:",
        "      - orders_service",
        "    metadata:",
        "      source: packages/core",
        "      external_url: https://example.com/backend-services",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/metadata-references.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/metadata-references.dp.yaml\n");
  });
});

test("diagrampilot validate rejects external URLs in metadata source references", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-source-reference.dp.yaml"),
      [
        "version: 1",
        "title: Bad Source Reference Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    metadata:",
        "      source: https://example.com/api-gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-source-reference.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /nodes\[0\]\.metadata\.source must be a local repository path or path-like glob\./,
    );
    assert.match(result.stderr, /Use metadata\.external_url for external URLs/);
  });
});

test("diagrampilot validate rejects local paths in metadata external references", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-external-reference.dp.yaml"),
      [
        "version: 1",
        "title: Bad External Reference Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "    metadata:",
        "      external_url: src/gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-external-reference.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /nodes\[0\]\.metadata\.external_url must be an external URL\./,
    );
    assert.match(result.stderr, /Use metadata\.source for local repo paths/);
  });
});

test("diagrampilot validate rejects duplicate stable IDs across diagram objects", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "duplicate-ids.dp.yaml"),
      [
        "version: 1",
        "title: Duplicate ID Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "groups:",
        "  - id: web_app",
        "    label: Frontend Group",
        "    contains:",
        "      - web_app",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/duplicate-ids.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /edges\[0\]\.id duplicates nodes\[1\]\.id "api_gateway"\./,
    );
    assert.match(
      result.stderr,
      /groups\[0\]\.id duplicates nodes\[0\]\.id "web_app"\./,
    );
    assert.match(
      result.stderr,
      /Assign a unique stable ID across nodes, edges, and groups\./,
    );
  });
});

test("diagrampilot validate rejects group containment entries outside nodes and groups", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-group-containment.dp.yaml"),
      [
        "version: 1",
        "title: Bad Group Containment Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    contains:",
        "      - web_app_to_api_gateway",
        "      - missing_service",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-group-containment.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /groups\[0\]\.contains\[0\] references edge "web_app_to_api_gateway"; groups can contain nodes and groups only\./,
    );
    assert.match(
      result.stderr,
      /groups\[0\]\.contains\[1\] references unknown node or group "missing_service"\./,
    );
  });
});

test("diagrampilot validate rejects missing and non-array group containment", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-group-contains-shape.dp.yaml"),
      [
        "version: 1",
        "title: Bad Group Contains Shape Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "groups:",
        "  - id: backend",
        "    label: Backend",
        "  - id: services",
        "    label: Services",
        "    contains: api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-group-contains-shape.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /groups\[0\]\.contains is required\./);
    assert.match(
      result.stderr,
      /groups\[1\]\.contains must be an array of node or group IDs\./,
    );
  });
});

test("diagrampilot validate accepts nested groups that contain nodes and groups", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "nested-groups.dp.yaml"),
      [
        "version: 1",
        "title: Nested Group Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "  - id: worker",
        "    label: Worker",
        "  - id: jobs_queue",
        "    label: Jobs Queue",
        "groups:",
        "  - id: services",
        "    label: Services",
        "    contains:",
        "      - api_gateway",
        "      - worker",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - services",
        "      - jobs_queue",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/nested-groups.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/nested-groups.dp.yaml\n");
  });
});

test("diagrampilot validate rejects group containment cycles", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "group-cycle.dp.yaml"),
      [
        "version: 1",
        "title: Group Cycle Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "groups:",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - services",
        "  - id: services",
        "    label: Services",
        "    contains:",
        "      - backend",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/group-cycle.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /groups\[1\]\.contains\[0\] creates a group containment cycle: backend -> services -> backend\./,
    );
    assert.match(
      result.stderr,
      /Remove one group containment reference from the cycle\./,
    );
  });
});

test("diagrampilot validate rejects duplicate group containment parentage", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "duplicate-group-parentage.dp.yaml"),
      [
        "version: 1",
        "title: Duplicate Group Parentage Architecture",
        "nodes:",
        "  - id: api_gateway",
        "    label: API Gateway",
        "  - id: orders_db",
        "    label: Orders DB",
        "groups:",
        "  - id: services",
        "    label: Services",
        "    contains:",
        "      - api_gateway",
        "  - id: data",
        "    label: Data",
        "    contains:",
        "      - orders_db",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - services",
        "      - orders_db",
        "  - id: platform",
        "    label: Platform",
        "    contains:",
        "      - services",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/duplicate-group-parentage.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /groups\[2\]\.contains\[1\] contains "orders_db", which is already contained by group "data"\./,
    );
    assert.match(
      result.stderr,
      /groups\[3\]\.contains\[0\] contains "services", which is already contained by group "backend"\./,
    );
    assert.match(
      result.stderr,
      /Each contained node or group can have at most one parent group\./,
    );
  });
});

test("diagrampilot validate rejects edge endpoints that are not nodes", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "broken-edge-endpoints.dp.yaml"),
      [
        "version: 1",
        "title: Broken Edge Endpoint Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: web_app_to_backend_services",
        "    from: web_app",
        "    to: backend_services",
        "  - id: ghost_client_to_api_gateway",
        "    from: ghost_client",
        "    to: api_gateway",
        "groups:",
        "  - id: backend_services",
        "    label: Backend Services",
        "    contains:",
        "      - api_gateway",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/broken-edge-endpoints.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /edges\[0\]\.to references group "backend_services"; edges must reference node IDs\./,
    );
    assert.match(
      result.stderr,
      /edges\[1\]\.from references unknown node "ghost_client"\./,
    );
  });
});

test("diagrampilot validate rejects non-boolean edge directed values", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-edge-directed.dp.yaml"),
      [
        "version: 1",
        "title: Bad Edge Directed Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "    directed: sometimes",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-edge-directed.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /edges\[0\]\.directed must be a boolean when present\./,
    );
    assert.match(
      result.stderr,
      /Use true for directed edges or false for undirected edges\./,
    );
  });
});

test("diagrampilot validate rejects non-string edge labels", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-edge-label.dp.yaml"),
      [
        "version: 1",
        "title: Bad Edge Label Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "    label: 443",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/bad-edge-label.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /edges\[0\]\.label must be a plain-text string when present\./,
    );
    assert.match(
      result.stderr,
      /Use a plain-text label or omit edges\[0\]\.label\./,
    );
  });
});

test("diagrampilot validate accepts directed and explicit undirected edges without labels", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "valid-edge-semantics.dp.yaml"),
      [
        "version: 1",
        "title: Valid Edge Semantics Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "  - id: orders_db",
        "    label: Orders DB",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "  - id: api_gateway_to_orders_db",
        "    from: api_gateway",
        "    to: orders_db",
        "    directed: true",
        "  - id: api_gateway_related_to_orders_db",
        "    from: api_gateway",
        "    to: orders_db",
        "    directed: false",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["validate", "docs/valid-edge-semantics.dp.yaml"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, "Valid docs/valid-edge-semantics.dp.yaml\n");
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

test("diagrampilot export prints Mermaid for a valid DiagramSpec without rewriting the source", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const sourceText = [
      "version: 1",
      "title: Checkout Architecture",
      "direction: right",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "  - id: api_gateway",
      "    label: API Gateway",
      "  - id: checkout_service",
      "    label: Checkout Service",
      "  - id: orders_db",
      "    label: Orders DB",
      "groups:",
      "  - id: backend",
      "    label: Backend",
      "    contains:",
      "      - api_gateway",
      "      - checkout_service",
      "      - orders_db",
      "edges:",
      "  - id: web_app_to_api_gateway",
      "    from: web_app",
      "    to: api_gateway",
      "    label: HTTPS",
      "  - id: api_gateway_to_checkout_service",
      "    from: api_gateway",
      "    to: checkout_service",
      "  - id: checkout_service_related_to_orders_db",
      "    from: checkout_service",
      "    to: orders_db",
      "    directed: false",
      "",
    ].join("\n");

    await writeFile(sourcePath, sourceText, "utf8");

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    const sourceTextAfterExport = await readFile(sourcePath, "utf8");
    const docsEntriesAfterExport = await readdir(path.join(tempRoot, "docs"));

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      [
        "flowchart LR",
        "  web_app[\"Web App\"]",
        "  subgraph backend[\"Backend\"]",
        "    api_gateway[\"API Gateway\"]",
        "    checkout_service[\"Checkout Service\"]",
        "    orders_db[\"Orders DB\"]",
        "  end",
        "  web_app -->|HTTPS| api_gateway",
        "  api_gateway --> checkout_service",
        "  checkout_service --- orders_db",
        "",
      ].join("\n"),
    );
    assert.equal(sourceTextAfterExport, sourceText);
    assert.deepEqual(docsEntriesAfterExport.sort(), ["architecture.dp.yaml"]);
  });
});

test("diagrampilot export prints D2 for a valid DiagramSpec without rewriting the source", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const sourceText = [
      "version: 1",
      "title: Checkout Architecture",
      "direction: right",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "  - id: api_gateway",
      "    label: API Gateway",
      "  - id: checkout_service",
      "    label: Checkout Service",
      "  - id: orders_db",
      "    label: Orders DB",
      "groups:",
      "  - id: backend",
      "    label: Backend",
      "    contains:",
      "      - api_gateway",
      "      - checkout_service",
      "      - orders_db",
      "edges:",
      "  - id: web_app_to_api_gateway",
      "    from: web_app",
      "    to: api_gateway",
      "    label: HTTPS",
      "  - id: api_gateway_to_checkout_service",
      "    from: api_gateway",
      "    to: checkout_service",
      "  - id: checkout_service_related_to_orders_db",
      "    from: checkout_service",
      "    to: orders_db",
      "    directed: false",
      "",
    ].join("\n");

    await writeFile(sourcePath, sourceText, "utf8");

    const result = await runBuiltCli(
      ["export", "docs/architecture.dp.yaml", "--format", "d2"],
      tempRoot,
    );

    const sourceTextAfterExport = await readFile(sourcePath, "utf8");
    const docsEntriesAfterExport = await readdir(path.join(tempRoot, "docs"));

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      [
        "direction: right",
        "",
        'web_app: "Web App"',
        "backend: {",
        '  label: "Backend"',
        '  api_gateway: "API Gateway"',
        '  checkout_service: "Checkout Service"',
        '  orders_db: "Orders DB"',
        "}",
        "",
        'web_app -> backend.api_gateway: "HTTPS"',
        "backend.api_gateway -> backend.checkout_service",
        "backend.checkout_service -- backend.orders_db",
        "",
      ].join("\n"),
    );
    assert.equal(sourceTextAfterExport, sourceText);
    assert.deepEqual(docsEntriesAfterExport.sort(), ["architecture.dp.yaml"]);
  });
});

test("diagrampilot export writes Mermaid to a file when out is provided", async () => {
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
        "export",
        "docs/architecture.dp.yaml",
        "--format",
        "mermaid",
        "--out",
        "docs/architecture.mmd",
      ],
      tempRoot,
    );

    const exportedMermaid = await readFile(
      path.join(tempRoot, "docs", "architecture.mmd"),
      "utf8",
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.equal(
      exportedMermaid,
      [
        "flowchart LR",
        "  web_app[\"Web App\"]",
        "  api_gateway[\"API Gateway\"]",
        "  web_app -->|HTTPS| api_gateway",
        "",
      ].join("\n"),
    );
  });
});

test("diagrampilot export writes D2 to a file when out is provided", async () => {
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
        "export",
        "docs/architecture.dp.yaml",
        "--format",
        "d2",
        "--out",
        "docs/architecture.d2",
      ],
      tempRoot,
    );

    const exportedD2 = await readFile(
      path.join(tempRoot, "docs", "architecture.d2"),
      "utf8",
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.equal(
      exportedD2,
      [
        "direction: right",
        "",
        'web_app: "Web App"',
        'api_gateway: "API Gateway"',
        "",
        'web_app -> api_gateway: "HTTPS"',
        "",
      ].join("\n"),
    );
  });
});

test("diagrampilot render writes SVG through the included local D2 path", async () => {
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
    const sourceTextAfterRender = await readFile(sourcePath, "utf8");

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
    assert.match(renderedSvg, /<svg\b/);
    assert.match(renderedSvg, /Web App/);
    assert.match(renderedSvg, /API Gateway/);
    assert.match(renderedSvg, /HTTPS/);
    assert.equal(sourceTextAfterRender, sourceText);
  });
});

test("agent quickstart workflow renders SVG with deterministic provenance", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourceText = [
      "version: 1",
      "title: Checkout Architecture",
      "direction: right",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "    kind: frontend",
      "  - id: api_gateway",
      "    label: API Gateway",
      "    kind: service",
      "    icon: lucide:server",
      "  - id: orders_db",
      "    label: Orders DB",
      "    kind: database",
      "    icon: lucide:database",
      "edges:",
      "  - id: web_app_to_api_gateway",
      "    from: web_app",
      "    to: api_gateway",
      "    label: HTTPS",
      "  - id: api_gateway_to_orders_db",
      "    from: api_gateway",
      "    to: orders_db",
      "    label: reads/writes",
      "",
    ].join("\n");

    await writeFile(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
      sourceText,
      "utf8",
    );

    const validation = await runBuiltCli(
      ["validate", "docs/architecture.dp.yaml"],
      tempRoot,
    );
    const render = await runBuiltCli(
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

    assert.equal(validation.signal, null);
    assert.equal(validation.code, 0, validation.stderr);
    assert.equal(validation.stderr, "");
    assert.equal(validation.stdout, "Valid docs/architecture.dp.yaml\n");
    assert.equal(render.signal, null);
    assert.equal(render.code, 0, render.stderr);
    assert.equal(render.stdout, "");
    assert.equal(render.stderr, "");
    assert.match(renderedSvg, /<svg\b/);
    assert.notEqual(provenanceMatch, null);

    const provenance = JSON.parse(provenanceMatch.groups.json);

    assert.deepEqual(provenance, {
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

test("diagrampilot render requires an explicit output path", async () => {
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
      ["render", "docs/architecture.dp.yaml"],
      tempRoot,
    );
    const docsEntries = await readdir(path.join(tempRoot, "docs"));

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Missing render output path\./);
    assert.match(result.stderr, /Usage: diagrampilot render <path> --out <path>/);
    assert.deepEqual(docsEntries.sort(), ["architecture.dp.yaml"]);
  });
});

test("diagrampilot render validates input before writing SVG", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "invalid-render.dp.yaml"),
      [
        "version: 1",
        "direction: sideways",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      [
        "render",
        "docs/invalid-render.dp.yaml",
        "--out",
        "docs/invalid-render.svg",
      ],
      tempRoot,
    );
    const docsEntries = await readdir(path.join(tempRoot, "docs"));

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-render\.dp\.yaml: Missing required top-level field: title\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-render\.dp\.yaml: direction must be one of: right, left, down, up\./,
    );
    assert.doesNotMatch(result.stderr, /Unable to render/);
    assert.deepEqual(docsEntries.sort(), ["invalid-render.dp.yaml"]);
  });
});

test("diagrampilot export requires valid DiagramSpec input before printing Mermaid", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "invalid-export.dp.yaml"),
      [
        "version: 1",
        "direction: sideways",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["export", "docs/invalid-export.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: Missing required top-level field: title\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: direction must be one of: right, left, down, up\./,
    );
    assert.doesNotMatch(result.stderr, /flowchart/);
  });
});

test("diagrampilot export requires valid DiagramSpec input before printing D2", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "invalid-export.dp.yaml"),
      [
        "version: 1",
        "direction: sideways",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["export", "docs/invalid-export.dp.yaml", "--format", "d2"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: Missing required top-level field: title\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: direction must be one of: right, left, down, up\./,
    );
    assert.doesNotMatch(result.stderr, /direction: /);
    assert.doesNotMatch(result.stderr, /->/);
  });
});

test("diagrampilot export validates input before writing an output file", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    const sourcePath = path.join(tempRoot, "docs", "invalid-export.dp.yaml");
    const sourceText = [
      "version: 1",
      "direction: sideways",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n");
    const outputPath = path.join(tempRoot, "docs", "invalid-export.mmd");
    const existingOutput = "existing exported text\n";

    await writeFile(sourcePath, sourceText, "utf8");
    await writeFile(outputPath, existingOutput, "utf8");

    const result = await runBuiltCli(
      [
        "export",
        "docs/invalid-export.dp.yaml",
        "--format",
        "mermaid",
        "--out",
        "docs/invalid-export.mmd",
      ],
      tempRoot,
    );
    const sourceTextAfterExport = await readFile(sourcePath, "utf8");
    const outputTextAfterExport = await readFile(outputPath, "utf8");

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: Missing required top-level field: title\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/invalid-export\.dp\.yaml: direction must be one of: right, left, down, up\./,
    );
    assert.equal(sourceTextAfterExport, sourceText);
    assert.equal(outputTextAfterExport, existingOutput);
  });
});

test("diagrampilot export rejects invalid top-level collection shapes without a stack trace", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "bad-collections.dp.yaml"),
      [
        "version: 1",
        "title: Bad Collections Architecture",
        "nodes: api_gateway",
        "edges: api_gateway_to_orders_service",
        "groups: backend_services",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["export", "docs/bad-collections.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/bad-collections\.dp\.yaml: nodes must be an array of node objects\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/bad-collections\.dp\.yaml: edges must be an array of edge objects when present\./,
    );
    assert.match(
      result.stderr,
      /DiagramSpec validation error in docs\/bad-collections\.dp\.yaml: groups must be an array of group objects when present\./,
    );
    assert.doesNotMatch(result.stderr, /TypeError/);
  });
});

test("diagrampilot export prints Mermaid for nested groups and vertical flow direction", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "platform.dp.yaml"),
      [
        "version: 1",
        "title: Platform Overview",
        "direction: down",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "  - id: worker",
        "    label: Worker",
        "  - id: jobs_queue",
        "    label: Jobs Queue",
        "groups:",
        "  - id: services",
        "    label: Services",
        "    contains:",
        "      - api_gateway",
        "      - worker",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - services",
        "      - jobs_queue",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "    label: HTTPS",
        "  - id: jobs_queue_to_worker",
        "    from: jobs_queue",
        "    to: worker",
        "    label: consumed by",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["export", "docs/platform.dp.yaml", "--format", "mermaid"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      [
        "flowchart TB",
        "  web_app[\"Web App\"]",
        "  subgraph backend[\"Backend\"]",
        "    subgraph services[\"Services\"]",
        "      api_gateway[\"API Gateway\"]",
        "      worker[\"Worker\"]",
        "    end",
        "    jobs_queue[\"Jobs Queue\"]",
        "  end",
        "  web_app -->|HTTPS| api_gateway",
        "  jobs_queue -->|consumed by| worker",
        "",
      ].join("\n"),
    );
  });
});

test("diagrampilot export prints D2 for nested groups and vertical flow direction", async () => {
  await withTempRepo(async (tempRoot) => {
    await mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "docs", "platform.dp.yaml"),
      [
        "version: 1",
        "title: Platform Overview",
        "direction: down",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "  - id: api_gateway",
        "    label: API Gateway",
        "  - id: worker",
        "    label: Worker",
        "  - id: jobs_queue",
        "    label: Jobs Queue",
        "groups:",
        "  - id: services",
        "    label: Services",
        "    contains:",
        "      - api_gateway",
        "      - worker",
        "  - id: backend",
        "    label: Backend",
        "    contains:",
        "      - services",
        "      - jobs_queue",
        "edges:",
        "  - id: web_app_to_api_gateway",
        "    from: web_app",
        "    to: api_gateway",
        "    label: HTTPS",
        "  - id: jobs_queue_to_worker",
        "    from: jobs_queue",
        "    to: worker",
        "    label: consumed by",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await runBuiltCli(
      ["export", "docs/platform.dp.yaml", "--format", "d2"],
      tempRoot,
    );

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      [
        "direction: down",
        "",
        'web_app: "Web App"',
        "backend: {",
        '  label: "Backend"',
        "  services: {",
        '    label: "Services"',
        '    api_gateway: "API Gateway"',
        '    worker: "Worker"',
        "  }",
        '  jobs_queue: "Jobs Queue"',
        "}",
        "",
        'web_app -> backend.services.api_gateway: "HTTPS"',
        'backend.jobs_queue -> backend.services.worker: "consumed by"',
        "",
      ].join("\n"),
    );
  });
});
