import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let websiteBuildPromise;

async function websiteBuild() {
  websiteBuildPromise ??= new Promise((resolve, reject) => {
    const child = spawn("npm", ["--workspace", "website", "run", "build"], {
      cwd: repoRoot,
      env: { ...process.env, CI: "true" },
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
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          [
            `Website build failed with exit code ${code}.`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });

  return websiteBuildPromise;
}

async function gitLsFiles(paths) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["ls-files", "--", ...paths], {
      cwd: repoRoot,
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
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim().split("\n").filter(Boolean));
        return;
      }

      reject(new Error(stderr.trim() || `git ls-files exited with ${code}`));
    });
  });
}

test("public landing page presents the checkout demo workflow", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "index.html"),
    "utf8",
  );

  const diagramPilotHeadings = html.match(/<h1[^>]*>\s*DiagramPilot\s*<\/h1>/g) ?? [];
  assert.equal(diagramPilotHeadings.length, 1);
  assert.match(html, /repo-native diagram compiler for AI coding agents/i);
  assert.match(html, /Checkout Demo Project/);
  assert.match(html, /href="\/docs\/agents\/quickstart\/"/);
  assert.match(html, /href="\/docs\/"/);
  assert.match(html, /src="\/demo-projects\/checkout\/docs\/architecture\.svg"/);

  for (const command of [
    "diagrampilot check",
    "diagrampilot validate docs/architecture.dp.yaml",
    "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
    "diagrampilot export docs/architecture.dp.yaml --format mermaid",
  ]) {
    assert.match(html, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(html, /DiagramSpec[^.]+source of truth/i);
  assert.match(html, /review-stable SVG artifacts/i);
  assert.match(html, /deterministic provenance/i);
  assert.doesNotMatch(html, /MCP|Model Context Protocol/i);
  assert.doesNotMatch(html, /planned|deferred|future|not implemented|source mutation/i);

  for (const forbiddenClaim of [
    /pricing/i,
    /sign up/i,
    /signup/i,
    /hosted workspace/i,
    /prompt-to-diagram/i,
  ]) {
    assert.doesNotMatch(html, forbiddenClaim);
  }
});

test("custom website code avoids card-based landing page patterns", async () => {
  const customWebsiteFiles = await gitLsFiles([
    "website/astro.config.mjs",
    "website/scripts",
    "website/src",
  ]);

  assert.ok(customWebsiteFiles.length > 0);

  const forbiddenPatterns = [
    /\b(?:Card|CardGrid|LinkCard)\b/,
    /\b(?:feature|pricing|cta)[-_ ]?cards?\b/i,
    /\bfloating[-_ ]?panels?\b/i,
    /\bboxed[-_ ]?blurbs?\b/i,
    /class(?:Name)?=["'`][^"'`]*(?:card|panel|blurb)/i,
  ];

  for (const repoPath of customWebsiteFiles) {
    const source = await readFile(path.join(repoRoot, repoPath), "utf8");

    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        source,
        pattern,
        `${repoPath} should avoid card-based landing page patterns`,
      );
    }
  }
});
