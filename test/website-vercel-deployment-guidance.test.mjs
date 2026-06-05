import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentGuidePath = path.join(
  repoRoot,
  "docs-public",
  "agents",
  "deployment.md",
);

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

async function readDeploymentGuide() {
  return readFile(deploymentGuidePath, "utf8");
}

test("public deployment guidance documents the static Vercel Pro path", async () => {
  const guide = await readDeploymentGuide();

  assert.match(guide, /Vercel Pro is the only planned host/i);
  assert.match(guide, /Root Directory:\s*`website\/`/i);
  assert.match(guide, /Framework Preset:\s*`Astro`/i);
  assert.match(guide, /Build Command:\s*`npm run build`/i);
  assert.match(guide, /Output Directory:\s*`dist`/i);
  assert.match(guide, /Include source files outside of the Root Directory:\s*enabled/i);
  assert.match(guide, /static-only/i);
  assert.match(guide, /root product tests/i);
  assert.match(guide, /not part of the Vercel site build/i);
  assert.match(guide, /Spend Management/i);
  assert.match(guide, /pause production deployment/i);

  for (const excludedCapability of [
    "Vercel Functions",
    "server rendering",
    "databases",
    "object storage",
    "forms backend",
    "Cloudflare Pages",
  ]) {
    assert.match(
      guide,
      new RegExp(`${excludedCapability}[\\s\\S]{0,120}not`, "i"),
      `${excludedCapability} should be explicitly excluded`,
    );
  }
});

test("public deployment guidance lists stable hosted URLs", async () => {
  const guide = await readDeploymentGuide();

  for (const publicUrl of [
    "https://diagrampilot.com/",
    "https://diagrampilot.com/docs/",
    "https://diagrampilot.com/docs/agents/quickstart/",
    "https://diagrampilot.com/docs/agents/quickstart.md",
    "https://diagrampilot.com/docs/agents/spec/",
    "https://diagrampilot.com/docs/agents/spec.md",
    "https://diagrampilot.com/docs/agents/deployment/",
    "https://diagrampilot.com/docs/agents/deployment.md",
    "https://diagrampilot.com/llms.txt",
    "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
  ]) {
    assert.match(
      guide,
      new RegExp(publicUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("public deployment guidance validation commands are credential-free", async () => {
  const guide = await readDeploymentGuide();
  const validationCommands = guide.match(/```bash\n(?<commands>[\s\S]+?)\n```/)?.groups
    ?.commands;

  assert.equal(
    validationCommands,
    "npm --workspace website run build\nnpm test",
  );
  assert.match(guide, /no Vercel credentials/i);
  assert.doesNotMatch(validationCommands, /\bvercel\s+(?:deploy|build|pull|env)\b/i);
});

test("website publishes deployment guidance as human HTML and agent Markdown routes", async () => {
  await websiteBuild();

  const sourceMarkdown = await readDeploymentGuide();
  const html = await readFile(
    path.join(repoRoot, "website", "dist", "docs", "agents", "deployment", "index.html"),
    "utf8",
  );
  const markdown = await readFile(
    path.join(repoRoot, "website", "dist", "docs", "agents", "deployment.md"),
    "utf8",
  );

  assert.match(html, /Vercel Deployment/);
  assert.match(html, /Root Directory/);
  assert.match(html, /website\//);
  assert.equal(markdown, sourceMarkdown);
});
