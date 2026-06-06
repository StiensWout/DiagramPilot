import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentGuidePath = path.join(
  repoRoot,
  "docs",
  "development",
  "public-website-deployment.md",
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

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

test("internal deployment guidance documents the static Vercel Pro path", async () => {
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

test("internal deployment guidance lists the stable public website URLs", async () => {
  const guide = await readDeploymentGuide();

  for (const publicUrl of [
    "https://diagrampilot.com/",
    "https://diagrampilot.com/docs/",
    "https://diagrampilot.com/docs/agents/quickstart/",
    "https://diagrampilot.com/docs/agents/quickstart.md",
    "https://diagrampilot.com/docs/agents/installation/",
    "https://diagrampilot.com/docs/agents/installation.md",
    "https://diagrampilot.com/docs/agents/spec/",
    "https://diagrampilot.com/docs/agents/spec.md",
    "https://diagrampilot.com/llms.txt",
    "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
  ]) {
    assert.match(
      guide,
      new RegExp(publicUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  assert.doesNotMatch(guide, /https:\/\/diagrampilot\.com\/docs\/agents\/deployment/);
});

test("internal deployment guidance validation commands are credential-free", async () => {
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

test("website does not publish internal deployment guidance", async () => {
  await websiteBuild();

  assert.equal(
    await exists("website/dist/docs/agents/deployment/index.html"),
    false,
    "deployment guidance should remain internal maintainer documentation",
  );
  assert.equal(
    await exists("website/dist/docs/agents/deployment.md"),
    false,
    "deployment guidance should not be published as an agent Markdown route",
  );
});
