import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";
import {
  npmCommand,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliEntryPoint = path.join(repoRoot, "packages", "cli", "dist", "index.js");

export function runDiagramPilot(args) {
  return runProcess(
    npmCommand,
    ["exec", "--workspace", "diagrampilot", "--", "diagrampilot", ...args],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv(),
    },
  );
}

export function runBuiltCli(args, cwd = repoRoot) {
  return runProcess(process.execPath, [cliEntryPoint, ...args], {
    cwd,
    env: sanitizedTestEnv(),
  });
}

export function assertCliSuccess(result, { stdout = "", stderr = "" } = {}) {
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, stdout);
  assert.equal(result.stderr, stderr);
}

export function assertFreshCheckOutput(result) {
  assertCliSuccess(result, {
    stdout:
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
  });
}

export async function withTempRepo(run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-cli-"));

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function occurrenceCount(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

export function parseSuccessfulJsonCliPayload(result) {
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);

  return payload;
}

export function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

export async function findFilesMatching(rootPath, startPath, pattern) {
  const found = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (pattern.test(entry.name)) {
        found.push(path.relative(rootPath, absolutePath));
      }
    }
  }

  await visit(startPath);

  return found.sort();
}

export async function writeFreshDiagramArtifact(tempRoot) {
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
