import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";
import {
  npmCommand,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

export function assertCliSucceeded(result, { stderr = "" } = {}) {
  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, stderr);
}

export function assertCliSuccess(result, { stdout = "", stderr = "" } = {}) {
  assertCliSucceeded(result, { stderr });
  assert.equal(result.stdout, stdout);
}

export function assertCliFailure(
  result,
  { code = 1, stdout = "", stderrPatterns = [] } = {},
) {
  assert.equal(result.signal, null);
  assert.equal(result.code, code);
  assert.equal(result.stdout, stdout);
  for (const pattern of stderrPatterns) {
    assert.match(result.stderr, pattern);
  }
}

export function assertFreshCheckOutput(result) {
  assertCliSuccess(result, {
    stdout:
      "Checked 1 DiagramPilot Source File. All expected SVG artifacts are fresh.\n",
  });
}

export async function withTempRepo(run) {
  return withTempRepoPrefix("diagrampilot-cli-", run);
}

export async function readAgentSupportFiles(rootPath) {
  return {
    llmsText: await readFile(path.join(rootPath, "llms.txt"), "utf8"),
    guideText: await readFile(
      path.join(rootPath, "docs", "diagrampilot.md"),
      "utf8",
    ),
  };
}

export function assertLlmsPublicDocsLinks(llmsText) {
  assert.match(llmsText, /https:\/\/diagrampilot\.com\/llms\.txt/);
  assert.match(llmsText, /diagrampilot check/);
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

const minimalCheckoutArchitectureSourceText = [
  "version: 1",
  "title: Checkout Architecture",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "",
].join("\n");

const checkoutArchitectureSourceText = [
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

export const groupedCheckoutArchitectureSourceText = [
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

export async function writeCheckoutArchitectureSource(
  tempRoot,
  sourceText = checkoutArchitectureSourceText,
) {
  const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, sourceText, "utf8");
  return { sourcePath, sourceText };
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
  const { sourcePath, sourceText } = await writeCheckoutArchitectureSource(
    tempRoot,
    minimalCheckoutArchitectureSourceText,
  );
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
