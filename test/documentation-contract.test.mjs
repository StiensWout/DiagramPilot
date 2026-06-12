import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import {
  exists,
  gitLsFiles,
  repoRoot,
  websiteBuild,
} from "./website-test-helpers.mjs";

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
  "diagrampilot inspect",
  "diagrampilot mcp",
  "diagrampilot check docs --json",
  "diagrampilot inspect docs --json",
  "diagrampilot validate docs/architecture.dp.yaml",
  "diagrampilot validate docs/architecture.dp.yaml --json",
  "diagrampilot format docs/architecture.dp.yaml",
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
  "diagrampilot inspect",
  "diagrampilot check demo-projects/checkout --json",
  "diagrampilot inspect demo-projects/checkout --json",
  "diagrampilot validate docs/architecture.dp.yaml",
  "diagrampilot validate docs/architecture.dp.yaml --json",
  "diagrampilot format docs/architecture.dp.yaml",
  "diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg",
  "diagrampilot render docs/architecture.dp.yaml --format png --out docs/architecture.png",
  "diagrampilot export docs/architecture.dp.yaml --format mermaid",
  "diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2",
  "diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot",
];
const demoWorkflowCommands = [
  "diagrampilot check",
  "diagrampilot inspect",
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
  "https://diagrampilot.com/docs/agents/mcp.md",
  "https://diagrampilot.com/schema/diagramspec-v1.schema.json",
];
const readmePublicLinks = [
  "docs-public/agents/quickstart.md",
  "docs-public/agents/installation.md",
  "docs-public/agents/mcp.md",
  "schema/diagramspec-v1.schema.json",
];

async function readContract() {
  return readFile(contractPath, "utf8");
}

async function readRepoFile(repoPath) {
  return readFile(path.join(repoRoot, repoPath), "utf8");
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

  assertMatchesAll(contract, [
    /^# Documentation Contract$/m,
    /docs-public\/.*canonical Public Documentation source/s,
    /CONTEXT\.md/,
    /docs\/development\/\*/,
    /docs\/adr\/\*/,
    /docs\/agents\/\*/,
    /internal maintainer sources/,
    /website\/.*static consumer/s,
    /not a second source of\s+truth/,
    /website\/src\/content\/docs\/docs\/.*generated synced Starlight/s,
    /ignored/,
    /not canonical/,
  ]);
});

test("Documentation Contract defines public link contexts", async () => {
  const contract = await readContract();

  assertMatchesAll(contract, [
    /## Link Context Rules/,
    /GitHub-rendered docs/,
    /repo-relative links/,
    /README\.md/,
    /docs-public\/agents\/quickstart\.md/,
    /Website-rendered docs/,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
    /Package README/i,
    /npm/i,
    /llms\.txt/,
    /site-oriented public agent entrypoint/i,
  ]);
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
      "https://diagrampilot.com/docs/agents/mcp/",
      "https://diagrampilot.com/docs/agents/mcp.md",
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

test("Documentation Contract defines the private maintainer workflow relocation gate", async () => {
  assertMatchesAll(await readContract(), [
    /## Private Maintainer Workflow Relocation/,
    /Public Repository Surface/,
    /Private Maintainer Workflow/,
    /Linear is the\s+canonical home/i,
    /DP-19 Internal Maintainer Workflow Migration Map/,
    /\.scratch\/\*\*/,
    /CONTEXT\.md/,
    /docs\/adr\/\*\*/,
    /docs\/agents\/\*\*/,
    /docs\/development\/\*/,
    /No final deletion/i,
    /dependent\s+tooling and docs/i,
    /AGENTS\.md/,
    /npm test/,
    /npm run audit:fallow/,
  ]);
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

  assertIncludesAll(readme, readmePublicLinks, "README.md");
  assertIncludesAll(llmsText, canonicalPublicLinks, "llms.txt");
  assertIncludesAll(builtPublicDocsIndex, canonicalPublicLinks, "website/dist/docs/index.md");
  assert.match(publicDocsIndex, /\[Checkout demo quickstart]\(agents\/quickstart\.md\)/);
  assert.match(publicDocsIndex, /\[MCP guide]\(agents\/mcp\.md\)/);
  assert.match(
    publicDocsIndex,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(contract, /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/);
  assert.match(contract, /https:\/\/diagrampilot\.com\/docs\/agents\/mcp\.md/);
  assert.match(contract, /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/);
  assert.match(websiteLanding, /href="\/docs\/agents\/quickstart\/"/);
  assert.match(websiteLanding, /\/landing\/hero-workflow\.png/);
  assert.doesNotMatch(websiteLanding, /\/landing\/agent-flow(?:-v2)?\.png/);
  assert.notEqual(builtPublicDocsIndex, publicDocsIndex);
  assert.doesNotMatch(builtPublicDocsIndex, /\]\(agents\//);
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
      "DiagramPilot v0.3.0 Alpha Capability Release is the current release-aligned public shape.",
      "0.2 -> 0.3 Upgrade Guide",
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
      "Package installation does not create `llms.txt`, `docs/diagrampilot.md`, or",
      "Normal `diagrampilot init` does not create or update local agent docs or Repo",
      "`diagrampilot init --docs` creates or updates the managed local agent docs",
      "`diagrampilot init --config` creates a minimal `diagrampilot.config.yaml`",
      "Use `diagrampilot init --docs` only when the repository intentionally wants",
      "Use `diagrampilot init --config` only when the repository intentionally wants",
      "diagrampilot:init:start",
      "diagrampilot:init:end",
      "llms.txt",
      "docs/diagrampilot.md",
      "MCP support is alpha.",
      "diagrampilot mcp",
      "diagrampilot-mcp",
      "client configuration",
      "Model Context Protocol",
    ],
    "docs-public/agents/installation.md",
  );
  assert.match(
    installationGuide,
    /delete `llms\.txt` or `docs\/diagrampilot\.md` only if DiagramPilot created the\s+file and it contains no other project content/i,
  );
  assert.match(
    installationGuide,
    /Do not delete adopted `\*\.dp\.yaml`, SVG, Mermaid, D2, DOT, PNG, or Markdown\s+embed artifacts by default/i,
  );
  assert.match(
    installationGuide,
    /`\*\.dp\.json` files are not current DiagramPilot Source Files;\s+convert\s+project-owned diagram content to `\*\.dp\.yaml`/i,
  );
  assert.match(
    installationGuide,
    /Do not copy DiagramPilot public docs into a consuming repository as part of\s+installation/i,
  );
  assert.doesNotMatch(installationGuide, /npm run build|packages\/cli\/dist/);
  assert.doesNotMatch(installationGuide, /prealpha|preparing `0\.2\.0`/i);

  assertIncludesAll(readme, ["docs-public/agents/installation.md"], "README.md");
  assertIncludesAll(
    llmsText,
    ["https://diagrampilot.com/docs/agents/installation.md"],
    "llms.txt",
  );
  assertIncludesAll(
    contract,
    ["https://diagrampilot.com/docs/agents/installation.md"],
    "docs/development/documentation-contract.md",
  );

  assert.match(
    publicDocsIndex,
    /\[Installation and removal guide]\(agents\/installation\.md\)/,
  );
  assert.match(websiteLanding, /href="\/docs\/agents\/installation\/"/);
});

test("maintainer docs cover MCP package readiness and smoke validation", async () => {
  const releaseWorkflow = await readRepoFile("docs/development/release-version-workflow.md");
  const contract = await readContract();

  assertIncludesAll(
    releaseWorkflow,
    [
      "npm run check:package-readiness",
      "npm run check:package-publish-state -- --expect latest",
      "`nightly`",
      "`latest`",
      "@diagrampilot/mcp",
      "diagrampilot mcp --help",
      "diagrampilot-mcp --help",
      "MCP client configuration",
      "MCP smoke validation",
    ],
    "docs/development/release-version-workflow.md",
  );
  assert.match(contract, /diagrampilot mcp/);
  assert.match(contract, /https:\/\/diagrampilot\.com\/docs\/agents\/mcp\.md/);
});

test("release-aligned docs expose the v0.3.0 upgrade and package contract", async () => {
  const readme = await readRepoFile("README.md");
  const publicDocsIndex = await readRepoFile("docs-public/index.md");
  const installationGuide = await readRepoFile("docs-public/agents/installation.md");
  const cliReadme = await readRepoFile("packages/cli/README.md");
  const mcpReadme = await readRepoFile("packages/mcp/README.md");
  const contract = await readContract();

  for (const [label, source] of [
    ["README.md", readme],
    ["docs-public/index.md", publicDocsIndex],
    ["docs-public/agents/installation.md", installationGuide],
  ]) {
    assertMatchesAll(
      source,
      [
        /v0\.3\.0 Alpha Capability Release/,
        /0\.2\s*->\s*0\.3 upgrade/i,
        /YAML-only/i,
        /DOT/i,
        /PNG/i,
        /Repo Workflow Configuration/i,
        /diagrampilot generate/i,
        /Markdown embed/i,
        /MCP/i,
      ],
      label,
    );
  }

  assertMatchesAll(
    cliReadme,
    [/diagrampilot generate/i, /--format dot/i, /--format png/i, /MCP/i],
    "packages/cli/README.md",
  );
  assertMatchesAll(
    mcpReadme,
    [
      /v0\.3\.0 Alpha Capability Release/,
      /Source Creation/i,
      /Source Mutation/i,
      /Stable IDs/i,
      /Structured Diagram Operations/i,
    ],
    "packages/mcp/README.md",
  );
  assertMatchesAll(
    contract,
    [
      /v0\.3\.0 Alpha Capability Release/,
      /package-local README/i,
      /0\.2\s*->\s*0\.3 upgrade/i,
    ],
    "docs/development/documentation-contract.md",
  );
});
