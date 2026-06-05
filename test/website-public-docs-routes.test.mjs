import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
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
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `git ls-files exited with ${code}`));
    });
  });
}

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

test("website publishes public docs as human HTML and agent Markdown routes", async () => {
  await websiteBuild();

  const sourceMarkdown = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );
  const html = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "quickstart",
      "index.html",
    ),
    "utf8",
  );
  const markdown = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "quickstart.md",
    ),
    "utf8",
  );

  assert.match(html, /Try DiagramPilot With The Checkout Demo Project/);
  assert.match(html, /diagrampilot check/);
  assert.equal(markdown, sourceMarkdown);
  assert.equal(
    await exists("website/src/content/docs/docs/agents/quickstart.md"),
    true,
    "Starlight should receive synced public Markdown during the build",
  );
});

test("website publishes llms.txt and the public DiagramSpec schema", async () => {
  await websiteBuild();

  const sourceLlmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");
  const builtLlmsText = await readFile(
    path.join(repoRoot, "website", "dist", "llms.txt"),
    "utf8",
  );
  const sourceSchema = await readFile(
    path.join(repoRoot, "schema", "diagramspec-v1.schema.json"),
    "utf8",
  );
  const builtSchema = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "schema",
      "diagramspec-v1.schema.json",
    ),
    "utf8",
  );

  assert.equal(builtLlmsText, sourceLlmsText);
  assert.equal(builtSchema, sourceSchema);
});

test("website build excludes internal docs and keeps synced copies untracked", async () => {
  await websiteBuild();

  for (const internalRoute of [
    "website/dist/docs/agents/issue-tracker/index.html",
    "website/dist/docs/agents/issue-tracker.md",
    "website/dist/docs/agents/triage-labels/index.html",
    "website/dist/docs/agents/triage-labels.md",
    "website/dist/docs/agents/domain/index.html",
    "website/dist/docs/agents/domain.md",
    "website/dist/docs/development/architecture/index.html",
    "website/dist/docs/development/architecture.md",
    "website/dist/docs/development/roadmap/index.html",
    "website/dist/docs/development/roadmap.md",
    "website/dist/docs/adr/0006-public-docs-live-under-docs-public/index.html",
    "website/dist/docs/adr/0006-public-docs-live-under-docs-public.md",
  ]) {
    assert.equal(await exists(internalRoute), false, `${internalRoute} should not be published`);
  }

  assert.equal(
    await exists("website/dist/agents/quickstart/index.html"),
    false,
    "public docs should not also be published outside the /docs route prefix",
  );

  const trackedGeneratedFiles = await gitLsFiles([
    "website/src/content/docs/docs",
    "website/public/llms.txt",
    "website/public/schema",
  ]);

  assert.equal(trackedGeneratedFiles, "");
});
