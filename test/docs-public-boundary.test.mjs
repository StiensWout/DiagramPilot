import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  exists,
  internalDocs,
  publicAgentDocs,
  repoRoot,
} from "./docs-public-boundary-helpers.mjs";
import { assertMatchesAll } from "./assertion-helpers.mjs";

function assertQuickstartArtifactWorkflow(quickstart) {
  assertMatchesAll(quickstart, [
    /DiagramPilot Source Files/,
    /Derived Artifacts/,
    /review\/CI command/i,
    /read-only/i,
    /next-to-source same-stem Expected SVG Artifact/i,
    /SVG freshness is provenance-based/i,
    /Configured Mermaid, D2, and DOT artifacts use content comparison/i,
    /Configured PNG freshness is presence-only in v0\.3\.0/i,
    /diagrampilot\.config\.yaml/,
    /sources\.ignore/,
    /artifacts/,
    /sourceGlob/,
    /matched mappings replace the default SVG\s+expectation/i,
    /Validate before rendering/,
    /render` requires `--out`/,
    /sourcePath/,
    /sourceSha256/,
    /diagramPilotVersion/,
    /renderer/,
    /does not include wall-clock timestamps/,
    /export` prints to stdout by default/,
    /Use `--out` only when you want to write/,
  ]);
}

function assertQuickstartInitGuidance(quickstart) {
  assertMatchesAll(quickstart, [
    /`diagrampilot init` does not create or update `llms\.txt` or `docs\/diagrampilot\.md` by default/,
    /Use `diagrampilot init --docs` only when the repository intentionally wants managed local agent docs/,
    /Use `diagrampilot init --config`\s+only when the repository intentionally wants\s+`diagrampilot\.config\.yaml`/i,
  ]);
}

function assertBrandAssetEntrypoints({ readme, brandUsePolicy, llmsText }) {
  assertMatchesAll(readme, [
    /<picture>/,
    /<source[^>]+srcset="assets\/brand\/diagrampilot-logo-light\.svg">/,
    /<img src="assets\/brand\/diagrampilot-logo\.svg"/,
    /Canonical DiagramPilot Brand Assets live in `assets\/brand\/`/,
    /\[DiagramPilot mark\]\(assets\/brand\/diagrampilot-mark\.svg\)/,
    /\[Brand Use Policy\]\(BRAND_USE_POLICY\.md\)/,
  ]);
  assertMatchesAll(brandUsePolicy, [
    /assets\/brand\/diagrampilot-logo\.svg/,
    /assets\/brand\/diagrampilot-logo-light\.svg/,
    /Canonical DiagramPilot Brand Assets live in `assets\/brand\/`/,
  ]);
  assertMatchesAll(llmsText, [
    /https:\/\/diagrampilot\.com\/brand\/diagrampilot-logo\.svg/,
    /https:\/\/diagrampilot\.com\/brand\/diagrampilot-logo-light\.svg/,
    /https:\/\/diagrampilot\.com\/brand\/diagrampilot-mark\.svg/,
    /BRAND_USE_POLICY\.md/,
  ]);
}

function assertCheckoutDemoDocument(documentText, extraPatterns = []) {
  assertMatchesAll(documentText, [
    /Checkout Demo Project/,
    /diagrampilot check/,
    ...extraPatterns,
  ]);
}

function assertCheckoutDemoRoute({ quickstart, readme, checkoutDemoReadme }) {
  assertCheckoutDemoDocument(quickstart, [/demo-projects\/checkout/]);
  assertCheckoutDemoDocument(readme, [/demo-projects\/checkout/]);
  assertCheckoutDemoDocument(checkoutDemoReadme);
}

function assertQuickstartCheckoutCommands(quickstart) {
  assertMatchesAll(quickstart, [
    /npm install/,
    /npm run build/,
    /node \.\.\/\.\.\/packages\/cli\/dist\/index\.js/,
    /cd demo-projects\/checkout/,
  ]);
}

function assertArchitectureExampleCommands(documentText) {
  assertMatchesAll(documentText, [
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
  ]);
}

test("public-facing agent usage docs live under the public docs root", async () => {
  for (const fileName of publicAgentDocs) {
    assert.equal(
      await exists(path.join("docs-public", "agents", fileName)),
      true,
      `${fileName} should be in docs-public/agents`,
    );
    assert.equal(
      await exists(path.join("docs", "agents", fileName)),
      false,
      `${fileName} should not remain in docs/agents`,
    );
  }
});

test("internal maintainer docs remain under the internal docs tree", async () => {
  for (const repoPath of internalDocs) {
    assert.equal(await exists(repoPath), true, `${repoPath} should exist`);
    assert.equal(
      await exists(path.join("docs-public", path.relative("docs", repoPath))),
      false,
      `${repoPath} should not be copied into docs-public`,
    );
  }
});

test("llms.txt links only public documentation", async () => {
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/spec\.md/,
  );
  assert.doesNotMatch(llmsText, /docs\/development\//);
  assert.doesNotMatch(llmsText, /docs\/adr\//);
  assert.doesNotMatch(llmsText, /issue-tracker\.md/);
  assert.doesNotMatch(llmsText, /triage-labels\.md/);
  assert.doesNotMatch(llmsText, /domain\.md/);
});

test("llms.txt reflects current public docs and the published schema helper", async () => {
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(llmsText, /DiagramSpec v1 JSON Schema is a generated, committed public helper/);
  assert.match(llmsText, /does not replace core validation/);
  assert.match(llmsText, /normal `diagrampilot init` does not create local agent docs/i);
  assert.match(llmsText, /`diagrampilot init --docs` is opt-in/i);
  assert.match(llmsText, /normal `diagrampilot init` does not create Repo Workflow Configuration/i);
  assert.match(llmsText, /`diagrampilot init --config` is opt-in/i);
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/mcp\.md/,
  );
  assert.match(llmsText, /Alpha Model Context Protocol server/);
  assert.match(llmsText, /diagrampilot mcp/);
  assert.doesNotMatch(llmsText, /planned|deferred|future|not implemented|source mutation/i);
  assert.doesNotMatch(
    llmsText,
    /https:\/\/diagrampilot\.com\/schema\/diagrampilot\.schema\.json/,
  );
});

test("public DiagramSpec guide presents JSON Schema as a tooling helper", async () => {
  const specGuide = await readFile(
    path.join(repoRoot, "docs-public", "agents", "spec.md"),
    "utf8",
  );

  assert.match(
    specGuide,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(specGuide, /helper for editors, code generators, and other tooling/);
  assert.match(specGuide, /does not replace `diagrampilot validate`/);
  assert.match(specGuide, /core validation remains authoritative/);
});

test("public docs present YAML-only source support and JSON tooling compatibility", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");
  const specGuide = await readFile(
    path.join(repoRoot, "docs-public", "agents", "spec.md"),
    "utf8",
  );
  const quickstart = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );

  for (const publicSurface of [readme, llmsText, specGuide, quickstart]) {
    assert.match(publicSurface, /\*\.dp\.yaml/);
    assert.match(publicSurface, /\*\.dp\.json/);
    assert.match(publicSurface, /not a DiagramPilot Source File path/i);
    assert.match(publicSurface, /repo discovery ignores JSON\s+source files/i);
    assert.match(publicSurface, /does not provide .*migration command/i);
    assert.match(publicSurface, /--json/);
    assert.match(publicSurface, /JSON Schema/);
    assert.match(publicSurface, /provenance/i);
  }

  assert.doesNotMatch(specGuide, /stored as YAML or JSON/i);
  assert.doesNotMatch(quickstart, /use `\*\.dp\.yaml` or `\*\.dp\.json`/i);
  assert.doesNotMatch(readme, /as YAML or JSON/i);
});

test("repository guidance separates public docs from internal maintainer docs", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.match(agentGuide, /docs-public\/agents\/quickstart\.md/);
  assert.match(agentGuide, /docs-public\/agents\/installation\.md/);
  assert.match(agentGuide, /docs-public\/agents\/spec\.md/);
  assert.match(agentGuide, /docs-public\/agents\/error-repair\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/quickstart\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/installation\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/spec\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/error-repair\.md/);

  assert.match(agentGuide, /docs\/agents\/issue-tracker\.md/);
  assert.match(agentGuide, /docs\/agents\/triage-labels\.md/);
  assert.match(agentGuide, /docs\/agents\/domain\.md/);
  assert.match(agentGuide, /docs\/development\/public-website-deployment\.md/);
  assert.match(agentGuide, /docs\/development\/roadmap\.md/);
  assert.match(agentGuide, /docs\/adr\/0006-public-docs-live-under-docs-public\.md/);
  assert.match(agentGuide, /docs\/adr\/0009-package-install-does-not-install-local-agent-docs\.md/);
});

test("internal maintainer docs treat repo workflow check as shipped", async () => {
  const roadmap = await readFile(
    path.join(repoRoot, "docs", "development", "roadmap.md"),
    "utf8",
  );
  const architecture = await readFile(
    path.join(repoRoot, "docs", "development", "architecture.md"),
    "utf8",
  );

  assert.match(roadmap, /`diagrampilot check \[path\] \[--json\]`/);
  assert.match(roadmap, /Repo Workflow Check is complete/);
  assert.match(architecture, /`diagrampilot check \[path\] \[--json\]`/);
  assert.doesNotMatch(
    roadmap,
    /The next product capability phase is the first Repo Workflow Check/,
  );
  assert.doesNotMatch(
    architecture,
    /the next architecture work is about deepening the current modules/,
  );
});

test("README describes current behavior and public docs only", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assert.match(
    readme,
    /docs-public\/agents\/quickstart\.md/,
  );
  assert.match(
    readme,
    /schema\/diagramspec-v1\.schema\.json/,
  );

  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/development\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/adr\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\/deployment\.md/);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\/issue-tracker\.md/);
  assert.doesNotMatch(readme, /docs\/development\//);
  assert.doesNotMatch(readme, /docs\/adr\//);
  assert.doesNotMatch(readme, /\.scratch\//);
  assert.match(readme, /docs-public\/agents\/mcp\.md/);
  assert.match(readme, /diagrampilot mcp/);
  assert.match(readme, /alpha Model Context Protocol stdio server/);
  assert.doesNotMatch(readme, /planned|deferred|future|not implemented|source mutation/i);
});

test("public entrypoints expose canonical DiagramPilot Brand Assets", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const publicDocsIndex = await readFile(
    path.join(repoRoot, "docs-public", "index.md"),
    "utf8",
  );
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");
  const brandUsePolicy = await readFile(
    path.join(repoRoot, "BRAND_USE_POLICY.md"),
    "utf8",
  );

  assertBrandAssetEntrypoints({ readme, brandUsePolicy, llmsText });
  assertMatchesAll(publicDocsIndex, [
    /\/brand\/diagrampilot-logo\.svg/,
    /\/brand\/diagrampilot-logo-light\.svg/,
    /BRAND_USE_POLICY\.md/,
  ]);
});

test("public quickstart and README route users through the checkout demo workflow", async () => {
  const quickstart = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");
  const checkoutDemoReadme = await readFile(
    path.join(repoRoot, "demo-projects", "checkout", "README.md"),
    "utf8",
  );

  assertCheckoutDemoRoute({ quickstart, readme, checkoutDemoReadme });
  assertQuickstartCheckoutCommands(quickstart);
  assertArchitectureExampleCommands(quickstart);
  assertMatchesAll(quickstart, [
    /diagrampilot check/,
    /diagrampilot export docs\/architecture\.dp\.yaml --format mermaid/,
    /diagrampilot export docs\/architecture\.dp\.yaml --format d2 --out docs\/architecture\.d2/,
    /diagrampilot export docs\/architecture\.dp\.yaml --format dot --out docs\/architecture\.dot/,
    /copy the same source\/render pattern/i,
    /another repository/i,
  ]);
  assertMatchesAll(readme, [
    /docs-public\/agents\/quickstart\.md/,
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
  ]);
  assertMatchesAll(llmsText, [
    /Canonical beginner workflow/,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  ]);

  assert.match(checkoutDemoReadme, /read-only repo review\/CI command/);
  assert.match(
    checkoutDemoReadme,
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
  );
  assert.match(
    checkoutDemoReadme,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
  );
});

test("landing page, README, and llms.txt use context-appropriate quickstart routes", async () => {
  const landingPage = await readFile(
    path.join(repoRoot, "website", "src", "pages", "index.astro"),
    "utf8",
  );
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assert.match(landingPage, /href="\/docs\/agents\/quickstart\/"/);
  assert.match(
    readme,
    /docs-public\/agents\/quickstart\.md/,
  );
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
});

test("public quickstart explains current DiagramPilot artifact and CLI behavior", async () => {
  const quickstart = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );

  assertQuickstartArtifactWorkflow(quickstart);
  assertQuickstartInitGuidance(quickstart);
});

test("public examples reference current packages and avoid deferred features", async () => {
  const examples = await readFile(
    path.join(repoRoot, "docs-public", "agents", "examples.md"),
    "utf8",
  );

  assert.match(examples, /packages\/cli/);
  assert.match(examples, /packages\/core/);
  assert.match(examples, /packages\/render-svg/);
  assert.match(examples, /packages\/export-mermaid/);
  assert.match(examples, /packages\/export-d2/);
  assert.match(examples, /packages\/export-dot/);
  assert.doesNotMatch(examples, /packages\/layout/);
  assert.doesNotMatch(examples, /\bPNG\b/);
  assert.doesNotMatch(examples, /\bMCP\b/);

  const iconNames = Array.from(
    examples.matchAll(/icon: lucide:([a-z0-9-]+)/gu),
    (match) => match[1],
  );

  assert.notEqual(iconNames.length, 0);

  for (const iconName of iconNames) {
    assert.equal(
      await exists(path.join("node_modules", "lucide-static", "icons", `${iconName}.svg`)),
      true,
      `lucide:${iconName} should be a packaged icon`,
    );
  }
});

test("public surface describes shipped DiagramPilot behavior only", async () => {
  const publicSurfaceFiles = [
    "README.md",
    "llms.txt",
    "website/src/pages/index.astro",
    ...publicAgentDocs.map((fileName) => path.join("docs-public", "agents", fileName)),
  ];

  assert.equal(
    await exists(path.join("docs-public", "agents", "mcp.md")),
    true,
    "MCP should be published as a public alpha guide",
  );

  for (const repoPath of publicSurfaceFiles) {
    const source = await readFile(path.join(repoRoot, repoPath), "utf8");

    assert.doesNotMatch(
      source,
      /planned|deferred|future|not implemented/i,
      repoPath,
    );
  }
});

test("public install and removal details stay centralized in the canonical guide", async () => {
  const canonicalInstallGuidePath = path.join(
    "docs-public",
    "agents",
    "installation.md",
  );
  const publicSurfaceFiles = [
    "README.md",
    "llms.txt",
    "docs-public/index.md",
    ...publicAgentDocs
      .map((fileName) => path.join("docs-public", "agents", fileName))
      .filter((repoPath) => repoPath !== canonicalInstallGuidePath),
  ];
  const longFormInstallPatterns = [
    /pnpm dlx diagrampilot check/,
    /yarn dlx diagrampilot check/,
    /bunx diagrampilot check/,
    /npm install --global diagrampilot/,
    /npm uninstall diagrampilot/,
    /diagrampilot:init:start/,
  ];

  for (const repoPath of publicSurfaceFiles) {
    const source = await readFile(path.join(repoRoot, repoPath), "utf8");

    for (const pattern of longFormInstallPatterns) {
      assert.doesNotMatch(source, pattern, repoPath);
    }
  }
});
