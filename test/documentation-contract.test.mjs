import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = path.join(
  repoRoot,
  "docs",
  "development",
  "documentation-contract.md",
);
const implementedCliCommands = [
  "diagrampilot init",
  "diagrampilot init --docs",
  "diagrampilot check",
  "diagrampilot check docs --json",
  "diagrampilot validate docs/architecture.dp.yaml",
  "diagrampilot validate docs/architecture.dp.yaml --json",
  "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
  "diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png",
  "diagrampilot export docs/architecture.dp.yaml --format mermaid",
  "diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2",
  "diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot",
];
const quickstartCliCommands = [
  "diagrampilot init",
  "diagrampilot init --docs",
  "diagrampilot check",
  "diagrampilot check demo-projects/checkout --json",
  "diagrampilot validate docs/architecture.dp.yaml",
  "diagrampilot validate docs/architecture.dp.yaml --json",
  "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
  "diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png",
  "diagrampilot export docs/architecture.dp.yaml --format mermaid",
  "diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2",
  "diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot",
];
const demoWorkflowCommands = [
  "diagrampilot check",
  "diagrampilot validate docs/architecture.dp.yaml",
  "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
  "diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png",
  "diagrampilot export docs/architecture.dp.yaml --format mermaid",
  "diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2",
  "diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot",
];
const canonicalPublicLinks = [
  "https://diagrampilot.com/docs/agents/quickstart.md",
  "https://diagrampilot.com/docs/agents/installation.md",
  "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
];

async function readContract() {
  return readFile(contractPath, "utf8");
}

async function readRepoFile(repoPath) {
  return readFile(path.join(repoRoot, repoPath), "utf8");
}

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

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
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

function contractPublicRoutes(contract) {
  return Array.from(
    contract.matchAll(/\|\s*[^|\n]+\s*\|\s*`(https:\/\/diagrampilot\.com\/[^`]*)`\s*\|/g),
    (match) => new URL(match[1]),
  );
}

function routeDistPath(route) {
  if (route.pathname === "/") return "website/dist/index.html";
  if (route.pathname.endsWith("/")) {
    return path.join("website", "dist", route.pathname, "index.html");
  }

  return path.join("website", "dist", route.pathname);
}

function assertIncludesAll(source, expected, label) {
  for (const value of expected) {
    assert.match(source, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), label);
  }
}

test("internal Documentation Contract names canonical and generated documentation surfaces", async () => {
  const contract = await readContract();

  assert.match(contract, /^# Documentation Contract$/m);
  assert.match(contract, /docs-public\/.*canonical Public Documentation source/s);
  assert.match(contract, /CONTEXT\.md/);
  assert.match(contract, /docs\/development\/\*/);
  assert.match(contract, /docs\/adr\/\*/);
  assert.match(contract, /docs\/agents\/\*/);
  assert.match(contract, /internal maintainer sources/);
  assert.match(contract, /website\/.*static consumer/s);
  assert.match(contract, /not a second source of\s+truth/);
  assert.match(contract, /website\/src\/content\/docs\/docs\/.*generated synced Starlight/s);
  assert.match(contract, /ignored/);
  assert.match(contract, /not canonical/);
});

test("Documentation Contract public route inventory is served by the website build", async () => {
  await websiteBuild();

  const routes = contractPublicRoutes(await readContract());

  assert.deepEqual(
    routes.map((route) => route.href),
    [
      "https://diagrampilot.com/",
      "https://diagrampilot.com/docs/",
      "https://diagrampilot.com/docs/index.md",
      "https://diagrampilot.com/docs/agents/quickstart/",
      "https://diagrampilot.com/docs/agents/quickstart.md",
      "https://diagrampilot.com/docs/agents/installation/",
      "https://diagrampilot.com/docs/agents/installation.md",
      "https://diagrampilot.com/docs/agents/spec/",
      "https://diagrampilot.com/docs/agents/spec.md",
      "https://diagrampilot.com/docs/agents/error-repair/",
      "https://diagrampilot.com/docs/agents/error-repair.md",
      "https://diagrampilot.com/docs/agents/examples/",
      "https://diagrampilot.com/docs/agents/examples.md",
      "https://diagrampilot.com/docs/agents/prompting/",
      "https://diagrampilot.com/docs/agents/prompting.md",
      "https://diagrampilot.com/llms.txt",
      "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
      "https://diagrampilot.com/demo-projects/checkout/docs/architecture.svg",
    ],
  );

  for (const route of routes) {
    const distPath = routeDistPath(route);

    assert.equal(await exists(distPath), true, `${route.href} should build ${distPath}`);
  }
});

test("Documentation Contract internal sources are not published and synced website copies are not canonical", async () => {
  await websiteBuild();

  for (const internalRoute of [
    "website/dist/CONTEXT.md",
    "website/dist/docs/development/documentation-contract/index.html",
    "website/dist/docs/development/documentation-contract.md",
    "website/dist/docs/development/public-website-deployment/index.html",
    "website/dist/docs/development/public-website-deployment.md",
    "website/dist/docs/adr/0006-public-docs-live-under-docs-public/index.html",
    "website/dist/docs/adr/0006-public-docs-live-under-docs-public.md",
    "website/dist/docs/agents/issue-tracker/index.html",
    "website/dist/docs/agents/issue-tracker.md",
    "website/dist/docs/agents/domain/index.html",
    "website/dist/docs/agents/domain.md",
  ]) {
    assert.equal(await exists(internalRoute), false, `${internalRoute} should not be published`);
  }

  assert.equal(
    await exists("website/src/content/docs/docs/index.md"),
    true,
    "Starlight should receive a synced Public Documentation index during the build",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/quickstart.md"),
    true,
    "Starlight should receive synced public agent docs during the build",
  );

  const websiteGitignore = await readFile(
    path.join(repoRoot, "website", ".gitignore"),
    "utf8",
  );
  assert.match(websiteGitignore, /^\/src\/content\/docs\/\*\*$/m);
  assert.match(websiteGitignore, /^!\/src\/content\/docs\/$/m);
  assert.match(websiteGitignore, /^\/public\/llms\.txt$/m);
  assert.match(websiteGitignore, /^\/public\/schema\/$/m);
  assert.match(websiteGitignore, /^\/public\/demo-projects\/$/m);

  const trackedGeneratedFiles = await gitLsFiles([
    "website/src/content/docs/docs",
    "website/public/llms.txt",
    "website/public/schema",
    "website/public/demo-projects",
  ]);

  assert.equal(trackedGeneratedFiles, "");
});

test("Documentation Contract drift checks align commands and canonical public links", async () => {
  await websiteBuild();

  const readme = await readRepoFile("README.md");
  const llmsText = await readRepoFile("llms.txt");
  const publicDocsIndex = await readRepoFile("docs-public/index.md");
  const quickstart = await readRepoFile("docs-public/agents/quickstart.md");
  const contract = await readContract();
  const checkoutDemoReadme = await readRepoFile("demo-projects/checkout/README.md");
  const websiteLanding = await readRepoFile("website/src/pages/index.astro");
  const builtPublicDocsIndex = await readRepoFile("website/dist/docs/index.md");

  for (const [label, source] of [
    ["README.md", readme],
    ["docs-public/index.md", publicDocsIndex],
    ["docs/development/documentation-contract.md", contract],
  ]) {
    assertIncludesAll(source, implementedCliCommands, label);
  }
  assertIncludesAll(
    quickstart,
    quickstartCliCommands,
    "docs-public/agents/quickstart.md",
  );

  for (const [label, source] of [
    ["README.md", readme],
    ["docs-public/index.md", publicDocsIndex],
    ["docs-public/agents/quickstart.md", quickstart],
    ["demo-projects/checkout/README.md", checkoutDemoReadme],
    ["website/dist/docs/index.md", builtPublicDocsIndex],
  ]) {
    assertIncludesAll(source, demoWorkflowCommands, label);
  }

  assertIncludesAll(readme, canonicalPublicLinks, "README.md");
  assertIncludesAll(llmsText, canonicalPublicLinks, "llms.txt");
  assert.match(publicDocsIndex, /\[Checkout demo quickstart]\(agents\/quickstart\.md\)/);
  assert.match(
    publicDocsIndex,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(contract, /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/);
  assert.match(contract, /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/);
  assert.match(websiteLanding, /href="\/docs\/agents\/quickstart\/"/);
  assert.match(websiteLanding, /\/landing\/hero-workflow\.png/);
  assert.doesNotMatch(websiteLanding, /\/landing\/agent-flow(?:-v2)?\.png/);
  assert.equal(builtPublicDocsIndex, publicDocsIndex);
});

test("canonical public install and removal guidance is complete and linked", async () => {
  await websiteBuild();

  const installationGuide = await readRepoFile("docs-public/agents/installation.md");
  const readme = await readRepoFile("README.md");
  const llmsText = await readRepoFile("llms.txt");
  const publicDocsIndex = await readRepoFile("docs-public/index.md");
  const contract = await readContract();
  const websiteLanding = await readRepoFile("website/src/pages/index.astro");
  const builtInstallationGuide = await readRepoFile(
    "website/dist/docs/agents/installation.md",
  );

  assert.equal(builtInstallationGuide, installationGuide);
  assertIncludesAll(
    installationGuide,
    [
      "npx diagrampilot check",
      "npm install --save-dev diagrampilot",
      "npm install --global diagrampilot",
      "DiagramPilot `0.2.0` is the first Public Alpha Release.",
      "npm `latest` release",
      "pnpm dlx diagrampilot check",
      "pnpm add -D diagrampilot",
      "yarn dlx diagrampilot check",
      "yarn add -D diagrampilot",
      "bunx diagrampilot check",
      "bun add -D diagrampilot",
      "npm uninstall diagrampilot",
      "npm uninstall --global diagrampilot",
      "pnpm remove diagrampilot",
      "yarn remove diagrampilot",
      "bun remove diagrampilot",
      "Package installation does not create `llms.txt` or `docs/diagrampilot.md`",
      "Normal `diagrampilot init` does not create or update local agent docs",
      "`diagrampilot init --docs` creates or updates the managed local agent docs",
      "Use `diagrampilot init --docs` only when the repository intentionally wants",
      "diagrampilot:init:start",
      "diagrampilot:init:end",
      "llms.txt",
      "docs/diagrampilot.md",
    ],
    "docs-public/agents/installation.md",
  );
  assert.match(
    installationGuide,
    /delete `llms\.txt` or `docs\/diagrampilot\.md` only if DiagramPilot created the\s+file and it contains no other project content/i,
  );
  assert.match(
    installationGuide,
    /Do not delete adopted `\*\.dp\.yaml`, `\*\.dp\.json`, SVG, Mermaid, D2, DOT, or PNG\s+artifacts by default/i,
  );
  assert.match(
    installationGuide,
    /Do not copy DiagramPilot public docs into a consuming repository as part of\s+installation/i,
  );
  assert.doesNotMatch(installationGuide, /npm run build|packages\/cli\/dist/);
  assert.doesNotMatch(installationGuide, /prealpha|preparing `0\.2\.0`/i);

  for (const [label, source] of [
    ["README.md", readme],
    ["llms.txt", llmsText],
    ["docs/development/documentation-contract.md", contract],
  ]) {
    assertIncludesAll(
      source,
      ["https://diagrampilot.com/docs/agents/installation.md"],
      label,
    );
  }

  assert.match(
    publicDocsIndex,
    /\[Installation and removal guide]\(agents\/installation\.md\)/,
  );
  assert.match(websiteLanding, /href="\/docs\/agents\/installation\/"/);
});
