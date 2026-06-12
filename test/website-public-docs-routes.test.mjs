import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  exists,
  gitLsFiles,
  publicDocsSync,
  repoRoot,
  websiteBuild,
} from "./website-test-helpers.mjs";
import { toWebsiteLinkContext } from "../website/scripts/link-context.mjs";

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
    await exists("website/src/content/docs/docs/agents/agent-workflow.md"),
    true,
    "synced agent workflow guide should remain present",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/installation.md"),
    true,
    "synced installation guide should remain present",
  );
});

test("website publishes public docs as human HTML and agent Markdown routes", async () => {
  await websiteBuild();

  const publicDocsIndex = await readFile(
    path.join(repoRoot, "docs-public", "index.md"),
    "utf8",
  );
  const sourceMarkdown = await readFile(
    path.join(repoRoot, "docs-public", "agents", "quickstart.md"),
    "utf8",
  );
  const agentWorkflowSourceMarkdown = await readFile(
    path.join(repoRoot, "docs-public", "agents", "agent-workflow.md"),
    "utf8",
  );
  const comparisonsSourceMarkdown = await readFile(
    path.join(repoRoot, "docs-public", "agents", "comparisons.md"),
    "utf8",
  );
  const integrationsSourceMarkdown = await readFile(
    path.join(repoRoot, "docs-public", "agents", "integrations.md"),
    "utf8",
  );
  const syncedIndexMarkdown = await readFile(
    path.join(repoRoot, "website", "src", "content", "docs", "docs", "index.md"),
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
  const agentWorkflowHtml = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "agent-workflow",
      "index.html",
    ),
    "utf8",
  );
  const agentWorkflowMarkdown = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "agent-workflow.md",
    ),
    "utf8",
  );
  const comparisonsHtml = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "comparisons",
      "index.html",
    ),
    "utf8",
  );
  const comparisonsMarkdown = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "comparisons.md",
    ),
    "utf8",
  );
  const integrationsHtml = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "integrations",
      "index.html",
    ),
    "utf8",
  );
  const integrationsMarkdown = await readFile(
    path.join(
      repoRoot,
      "website",
      "dist",
      "docs",
      "agents",
      "integrations.md",
    ),
    "utf8",
  );
  const websiteIndexMarkdown = await readFile(
    path.join(repoRoot, "website", "dist", "docs", "index.md"),
    "utf8",
  );

  assert.match(html, /Try DiagramPilot With The Checkout Demo Project/);
  assert.match(html, /diagrampilot check/);
  assert.match(agentWorkflowHtml, /Agent Workflow/);
  assert.match(agentWorkflowHtml, /diagrampilot inspect docs --json/);
  assert.match(comparisonsHtml, /Comparisons And Adjacent Tools/);
  assert.match(comparisonsHtml, /Graphviz\/DOT/);
  assert.match(integrationsHtml, /Integrations And Agent Recipes/);
  assert.match(integrationsHtml, /GitHub Actions/);
  assert.match(
    publicDocsIndex,
    /\[Checkout demo quickstart]\(agents\/quickstart\.md\)/,
  );
  assert.match(
    publicDocsIndex,
    /\[Agent workflow guide]\(agents\/agent-workflow\.md\)/,
  );
  assert.match(
    publicDocsIndex,
    /\[Comparisons and adjacent tools]\(agents\/comparisons\.md\)/,
  );
  assert.match(
    publicDocsIndex,
    /\[Integrations and agent recipes]\(agents\/integrations\.md\)/,
  );
  assert.match(
    syncedIndexMarkdown,
    /\[Checkout demo quickstart]\(https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md\)/,
  );
  assert.match(
    syncedIndexMarkdown,
    /\[Comparisons and adjacent tools]\(https:\/\/diagrampilot\.com\/docs\/agents\/comparisons\.md\)/,
  );
  assert.match(
    syncedIndexMarkdown,
    /\[Integrations and agent recipes]\(https:\/\/diagrampilot\.com\/docs\/agents\/integrations\.md\)/,
  );
  assert.match(
    websiteIndexMarkdown,
    /\[Checkout demo quickstart]\(https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md\)/,
  );
  assert.match(
    websiteIndexMarkdown,
    /\[Comparisons and adjacent tools]\(https:\/\/diagrampilot\.com\/docs\/agents\/comparisons\.md\)/,
  );
  assert.match(
    websiteIndexMarkdown,
    /\[Integrations and agent recipes]\(https:\/\/diagrampilot\.com\/docs\/agents\/integrations\.md\)/,
  );
  assert.doesNotMatch(websiteIndexMarkdown, /\]\(agents\//);
  assert.equal(markdown, sourceMarkdown);
  assert.equal(
    agentWorkflowMarkdown,
    toWebsiteLinkContext(agentWorkflowSourceMarkdown, "agents/agent-workflow.md"),
  );
  assert.equal(comparisonsMarkdown, comparisonsSourceMarkdown);
  assert.equal(integrationsMarkdown, integrationsSourceMarkdown);
  assert.equal(
    await exists("website/src/content/docs/docs/agents/quickstart.md"),
    true,
    "Starlight should receive synced public Markdown during the build",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/agent-workflow.md"),
    true,
    "Starlight should receive synced agent workflow Markdown during the build",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/comparisons.md"),
    true,
    "Starlight should receive synced comparisons Markdown during the build",
  );
  assert.equal(
    await exists("website/src/content/docs/docs/agents/integrations.md"),
    true,
    "Starlight should receive synced integrations Markdown during the build",
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
