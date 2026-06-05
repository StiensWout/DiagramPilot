import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const publicAgentDocs = [
  "quickstart.md",
  "spec.md",
  "error-repair.md",
  "examples.md",
  "mcp.md",
  "prompting.md",
];

const internalDocs = [
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  "docs/agents/domain.md",
  "docs/development/roadmap.md",
  "docs/development/architecture.md",
  "docs/development/public-website-deployment.md",
  "docs/adr/0006-public-docs-live-under-docs-public.md",
];

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
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

test("llms.txt reflects the published schema helper and deferred MCP scope", async () => {
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(llmsText, /DiagramSpec v1 JSON Schema is a generated, committed public helper/);
  assert.match(llmsText, /does not replace core validation/);
  assert.match(llmsText, /`version`, `title`, and `nodes` are required/);
  assert.match(llmsText, /`nodes` must contain at least one node/);
  assert.match(llmsText, /lowercase snake case/);
  assert.match(llmsText, /MCP is deferred/);
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

test("repository guidance separates public docs from internal maintainer docs", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.match(agentGuide, /docs-public\/agents\/quickstart\.md/);
  assert.match(agentGuide, /docs-public\/agents\/spec\.md/);
  assert.match(agentGuide, /docs-public\/agents\/error-repair\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/quickstart\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/spec\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/error-repair\.md/);

  assert.match(agentGuide, /docs\/agents\/issue-tracker\.md/);
  assert.match(agentGuide, /docs\/agents\/triage-labels\.md/);
  assert.match(agentGuide, /docs\/agents\/domain\.md/);
  assert.match(agentGuide, /docs\/development\/public-website-deployment\.md/);
  assert.match(agentGuide, /docs\/development\/roadmap\.md/);
  assert.match(agentGuide, /docs\/adr\/0006-public-docs-live-under-docs-public\.md/);
});

test("internal docs and agent guidance treat repo workflow check as shipped", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");
  const roadmap = await readFile(
    path.join(repoRoot, "docs", "development", "roadmap.md"),
    "utf8",
  );
  const architecture = await readFile(
    path.join(repoRoot, "docs", "development", "architecture.md"),
    "utf8",
  );

  assert.match(agentGuide, /diagrampilot check/);
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

test("README keeps public docs hosted and internal docs local", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assert.match(
    readme,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(readme, /docs\/development\/roadmap\.md/);
  assert.match(readme, /docs\/development\/architecture\.md/);
  assert.match(readme, /docs\/development\/public-website-deployment\.md/);
  assert.match(readme, /docs\/agents\/issue-tracker\.md/);
  assert.match(readme, /docs\/adr\/0006-public-docs-live-under-docs-public\.md/);
  assert.match(
    readme,
    /\.scratch\/public-website-publication\/PRD\.md/,
  );
  assert.match(readme, /Public Website Publication/);

  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/development\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/adr\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\/deployment\.md/);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\/issue-tracker\.md/);
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

  assert.match(quickstart, /Checkout Demo Project/);
  assert.match(quickstart, /demo-projects\/checkout/);
  assert.match(quickstart, /cd demo-projects\/checkout/);
  assert.match(quickstart, /diagrampilot check/);
  assert.match(
    quickstart,
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
  );
  assert.match(
    quickstart,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
  );
  assert.match(
    quickstart,
    /diagrampilot export docs\/architecture\.dp\.yaml --format mermaid/,
  );
  assert.match(
    quickstart,
    /diagrampilot export docs\/architecture\.dp\.yaml --format d2 --out docs\/architecture\.d2/,
  );

  assert.match(readme, /Checkout Demo Project/);
  assert.match(
    readme,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(readme, /diagrampilot check/);
  assert.match(readme, /diagrampilot validate docs\/architecture\.dp\.yaml/);
  assert.match(
    readme,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
  );

  assert.match(llmsText, /Checkout demo quickstart/);
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(llmsText, /diagrampilot check/);

  assert.match(checkoutDemoReadme, /diagrampilot check/);
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

test("public quickstart explains current DiagramPilot artifact and CLI behavior", async () => {
  const quickstart = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );

  assert.match(quickstart, /DiagramPilot Source Files/);
  assert.match(quickstart, /Derived Artifacts/);
  assert.match(quickstart, /review\/CI command/i);
  assert.match(quickstart, /read-only/i);
  assert.match(quickstart, /next-to-source same-stem Expected SVG Artifact/i);
  assert.match(quickstart, /SVG freshness is provenance-only in v1/i);
  assert.match(
    quickstart,
    /does not check Mermaid, D2, DOT, or PNG artifact freshness/i,
  );
  assert.match(
    quickstart,
    /does not support configurable artifact mappings or ignore patterns/i,
  );
  assert.match(quickstart, /Validate before rendering/);
  assert.match(quickstart, /render` requires `--out`/);
  assert.match(quickstart, /sourcePath/);
  assert.match(quickstart, /sourceSha256/);
  assert.match(quickstart, /diagramPilotVersion/);
  assert.match(quickstart, /renderer/);
  assert.match(quickstart, /does not include wall-clock timestamps/);
  assert.match(quickstart, /export` prints to stdout by default/);
  assert.match(quickstart, /Use `--out` only when you want to write/);
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
  assert.doesNotMatch(examples, /packages\/layout/);
  assert.doesNotMatch(examples, /\bDOT\b/);
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

test("public MCP plan describes MCP as deferred while pointing at the published schema", async () => {
  const mcpPlan = await readFile(
    path.join(repoRoot, "docs-public", "agents", "mcp.md"),
    "utf8",
  );

  assert.match(mcpPlan, /MCP is not implemented/);
  assert.match(mcpPlan, /published DiagramSpec v1 JSON Schema helper route/);
  assert.match(
    mcpPlan,
    /https:\/\/diagrampilot\.com\/schema\/diagramspec-v1\.schema\.json/,
  );
  assert.match(mcpPlan, /Source mutation tools are deferred/);
});

test("internal closeout docs record completed planning state and maintainer validation", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");
  const roadmap = await readFile(
    path.join(repoRoot, "docs", "development", "roadmap.md"),
    "utf8",
  );
  const mvpPrd = await readFile(
    path.join(repoRoot, ".scratch", "diagrampilot-mvp", "PRD.md"),
    "utf8",
  );
  const architectureDeepeningPrd = await readFile(
    path.join(repoRoot, ".scratch", "architecture-deepening", "PRD.md"),
    "utf8",
  );
  const docsDemoPrd = await readFile(
    path.join(repoRoot, ".scratch", "docs-demo-project-rework", "PRD.md"),
    "utf8",
  );

  assert.match(mvpPrd, /^Status: completed$/m);
  assert.match(architectureDeepeningPrd, /^Status: completed$/m);
  assert.match(docsDemoPrd, /^Status: completed$/m);

  assert.doesNotMatch(readme, /MVP implementation is in progress/);
  assert.match(
    readme,
    /MVP, architecture deepening, docs\/demo rework, Repo Workflow Check, and Repo\s+Workflow Check deepening checkpoints are complete/,
  );

  assert.match(roadmap, /Release readiness is complete/);
  assert.match(roadmap, /node --test test\/docs-public-boundary\.test\.mjs/);
  assert.match(roadmap, /node --test test\/checkout-demo-project\.test\.mjs/);
  assert.match(
    roadmap,
    /git diff --exit-code demo-projects\/checkout\/docs\/architecture\.svg/,
  );
  assert.match(roadmap, /npm test/);
});

test("completed docs demo rework issues include implementation notes and validation plans", async () => {
  const issuePaths = [
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "28-split-public-and-internal-documentation-roots.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "29-add-the-checkout-demo-project-fixture.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "30-rework-public-docs-around-the-demo-workflow.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "31-clean-up-internal-docs-and-closeout-planning-state.md",
    ),
  ];

  for (const issuePath of issuePaths) {
    const issueText = await readFile(path.join(repoRoot, issuePath), "utf8");

    assert.match(issueText, /^Status: completed$/m, issuePath);
    assert.doesNotMatch(issueText, /- \[ \]/, issuePath);
    assert.match(issueText, /^## Implementation notes$/m, issuePath);
    assert.match(issueText, /^## Validation plan$/m, issuePath);
  }
});
