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

async function publicDocsSync() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/sync-public-docs.mjs"], {
      cwd: path.join(repoRoot, "website"),
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
            `Public docs sync failed with exit code ${code}.`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
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

test("public docs sync can run concurrently without deleting current generated docs", async () => {
  await Promise.all(Array.from({ length: 8 }, () => publicDocsSync()));

  assert.equal(
    await exists("website/src/content/docs/docs/index.md"),
    true,
    "synced Public Documentation index should remain present",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/quickstart.md"),
    true,
    "synced quickstart should remain present",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/installation.md"),
    true,
    "synced installation guide should remain present",
  );
});

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
  assert.equal(
    await exists("website/dist/docs/agents/installation/index.html"),
    true,
    "installation guide should publish as HTML",
  );
  assert.equal(
    await exists("website/dist/docs/agents/installation.md"),
    true,
    "installation guide should publish as Markdown",
  );
});

test("website docs pages use published DiagramPilot brand assets", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "docs", "index.html"),
    "utf8",
  );

  assert.match(
    html,
    /href="\/brand\/diagrampilot-mark\.svg"[^>]*type="image\/svg\+xml"/,
  );
  assert.match(html, /src="\/brand\/diagrampilot-logo\.svg"/);
  assert.match(html, /src="\/brand\/diagrampilot-logo-light\.svg"/);
  assert.doesNotMatch(html, /href="\/favicon\.svg"/);
  assert.equal(await exists("website/dist/brand/diagrampilot-logo.svg"), true);
  assert.equal(await exists("website/dist/brand/diagrampilot-logo-light.svg"), true);
  assert.equal(await exists("website/dist/brand/diagrampilot-mark.svg"), true);
});

test("website docs pages render one page title and theme-compatible wordmark", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "docs", "index.html"),
    "utf8",
  );
  const logo = await readFile(
    path.join(repoRoot, "website", "dist", "brand", "diagrampilot-logo.svg"),
    "utf8",
  );
  const docsCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "docs.css"),
    "utf8",
  );

  assert.equal(
    (html.match(/<h1[^>]*>\s*Public Documentation\s*<\/h1>/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(
    html,
    /<h1[^>]*>\s*Public Documentation\s*<\/h1>[\s\S]*<h1[^>]*>\s*Public Documentation\s*<\/h1>/,
  );
  assert.match(logo, /fill="#0f172a"/);
  assert.match(html, /brand-wordmark-light-surface/);
  assert.match(html, /brand-wordmark-dark-surface/);
  assert.match(docsCss, /:root\[data-theme="dark"\]\s+\.brand-wordmark-light-surface/);
  assert.match(docsCss, /:root\[data-theme="dark"\]\s+\.brand-wordmark-dark-surface/);
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
    "website/public/brand",
    "website/public/llms.txt",
    "website/public/schema",
  ]);

  assert.equal(trackedGeneratedFiles, "");
});
