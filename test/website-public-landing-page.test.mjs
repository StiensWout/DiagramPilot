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

async function readBuiltLandingPage() {
  await websiteBuild();

  return readFile(path.join(repoRoot, "website", "dist", "index.html"), "utf8");
}

test("public landing page proves the local workflow inside the hero", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /id="workflow-proof"/,
    /aria-label="Interactive DiagramPilot workflow proof"/,
    /data-demo-stage/,
    /data-demo-control/,
    /aria-live="polite"/,
    /\.dp\.yaml/,
    /diagrampilot check/,
    /diagrampilot generate/,
    /architecture\.svg/,
    /Review-stable SVG artifact/,
    /prefers-reduced-motion:\s*reduce/,
  ]);

  const heroStart = html.indexOf('<section class="hero-zone"');
  const heroEnd = html.indexOf("</section>", heroStart);
  const proofStart = html.indexOf('id="workflow-proof"');

  assert.ok(heroStart >= 0);
  assert.ok(heroEnd > heroStart);
  assert.ok(proofStart > heroStart && proofStart < heroEnd);
  assert.doesNotMatch(html, /<section[^>]+id="workflow-proof"/);
  assert.doesNotMatch(html, /class="workflow-shell/);
  assert.doesNotMatch(html, /<img[^>]+src="\/landing\/hero-workflow\.png"/);
});

test("public landing page animates the local repository path", async () => {
  const html = await readBuiltLandingPage();
  const landingCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing-local-path.css"),
    "utf8",
  );

  assertMatchesAll(html, [
    /class="repo-path-animation"/,
    /data-path-step/,
    /repo checkout/,
    /docs\/architecture\.dp\.yaml/,
    /npx diagrampilot check/,
    /docs\/architecture\.svg/,
  ]);
  assert.match(landingCss, /@keyframes\s+repository-path-progress/);
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/);
});

test("public landing page offers starting points including npm", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /<h2>Starting points\.<\/h2>/,
    /href="https:\/\/www\.npmjs\.com\/package\/diagrampilot"/,
    /npm package/,
    /href="\/docs\/agents\/installation\/"/,
    /href="\/docs\/agents\/quickstart\/"/,
    /href="https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
  ]);
  assert.doesNotMatch(html, /Start with the checkout demo\./);
});

test("public landing page publishes search and social metadata for developer discovery", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /<title>DiagramPilot \| Repo-Native Diagrams For AI Coding Agents<\/title>/,
    /name="description" content="DiagramPilot turns \.dp\.yaml source files into review-stable SVG artifacts with local validation for AI coding agents and software repository reviews\."/,
    /name="robots" content="index, follow"/,
    /name="theme-color" content="#0f172a"/,
    /rel="canonical" href="https:\/\/diagrampilot\.com\/"/,
    /property="og:site_name" content="DiagramPilot"/,
    /property="og:locale" content="en_US"/,
    /property="og:image" content="https:\/\/diagrampilot\.com\/landing\/hero-workflow\.png"/,
    /name="twitter:image:alt" content="DiagramPilot repository workflow showing source, validation, and SVG output\."/,
    /type="application\/ld\+json"/,
    /"@type":"SoftwareApplication"/,
    /"applicationCategory":"DeveloperApplication"/,
    /"codeRepository":"https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
  ]);
});

test("public landing page presents generated product visuals", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "index.html"),
    "utf8",
  );

  const diagramPilotHeadings = html.match(/<h1[^>]*>\s*DiagramPilot\s*<\/h1>/g) ?? [];
  assert.equal(diagramPilotHeadings.length, 1);
  const heroStart = html.indexOf('<section class="hero-zone"');
  const artifactStart = html.indexOf("Product summary");
  const promiseStart = html
    .slice(heroStart, artifactStart)
    .search(
      /Commit diagrams like code:\s*`\.dp\.yaml` source in the repo,\s*local\s*checks before review,\s*and SVG artifacts maintainers can inspect/i,
  );
  assert.ok(heroStart >= 0);
  assert.ok(artifactStart > heroStart);
  assert.ok(promiseStart >= 0);
  assert.match(
    html,
    /Commit diagrams like code:\s*`\.dp\.yaml` source in the repo,\s*local\s*checks before review,\s*and SVG artifacts maintainers can inspect/i,
  );
  assert.match(
    html,
    /<img[^>]+class="hero-wordmark"[^>]+src="\/brand\/diagrampilot-logo-light\.svg"[^>]+alt=""/,
  );
  assert.doesNotMatch(
    html,
    /class="eyebrow">\s*Repo-native diagram compiler for AI coding agents\s*<\/p>/,
  );
  assertMatchesAll(html, [
    /GitHub repository/,
    /href="https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
    /href="\/docs\/agents\/quickstart\/"/,
    /href="\/docs\/"/,
    /href="#workflow-proof"/,
    /See the workflow/,
    /Install Guide/,
    /npx diagrampilot check/,
    /class="quick-command"/,
    /data-copy-command="npx diagrampilot check"/,
  ]);
  assert.match(
    html,
    /aria-label="Interactive DiagramPilot workflow proof"/,
  );
  assertMatchesAll(html, [
    /class="hero-copy motion-rise"/,
    /class="proof-item reveal-motion"/,
    /class="image-band reveal-motion"/,
    /IntersectionObserver/,
  ]);
  assert.doesNotMatch(html, /class="workflow-shell/);
  assert.doesNotMatch(html, /\/landing\/agent-flow(?:-v2)?\.png/);
  assertMatchesAll(html, [
    /Bring your own repository\./,
    /One command before review\./,
    /If it breaks, it says where\./,
    /From `\.dp\.yaml` to review-stable SVG without leaving the repo\./,
    /Source files become reviewable artifacts\./,
  ]);
  assert.doesNotMatch(html, /starlight-theme-select/);
  assert.doesNotMatch(html, /class="site-title/);
  assert.doesNotMatch(html, /Select theme/);
  assert.doesNotMatch(
    html,
    /Real rendered output|DiagramSpec stays source of truth|Generated examples|Examples agents can copy|Shipped workflow|The Workflow Agents Can Commit|shortest shipped workflow/i,
  );

  assertMatchesAll(html, [
    /diagrampilot check/,
    /diagrampilot generate/,
    /review-stable SVG\s+artifacts/i,
    /repairable errors/i,
    /MCP agent integration/i,
    /href="\/docs\/agents\/mcp\/"/,
  ]);
  assert.doesNotMatch(html, /planned|deferred|future|not implemented|source mutation/i);

  for (const forbiddenClaim of [
    /pricing/i,
    /sign up/i,
    /signup/i,
    /hosted workspace/i,
    /hosted storage/i,
    /prompt-only/i,
    /prompt only/i,
    /prompt-to-diagram/i,
  ]) {
    assert.doesNotMatch(html, forbiddenClaim);
  }
});

test("website publishes canonical brand assets and uses the mark as favicon", async () => {
  await websiteBuild();

  const canonicalMark = await readFile(
    path.join(repoRoot, "assets", "brand", "diagrampilot-mark.svg"),
    "utf8",
  );
  const canonicalLogo = await readFile(
    path.join(repoRoot, "assets", "brand", "diagrampilot-logo.svg"),
    "utf8",
  );
  const canonicalLightLogo = await readFile(
    path.join(repoRoot, "assets", "brand", "diagrampilot-logo-light.svg"),
    "utf8",
  );
  const publishedMark = await readFile(
    path.join(repoRoot, "website", "dist", "brand", "diagrampilot-mark.svg"),
    "utf8",
  );
  const publishedLogo = await readFile(
    path.join(repoRoot, "website", "dist", "brand", "diagrampilot-logo.svg"),
    "utf8",
  );
  const publishedLightLogo = await readFile(
    path.join(repoRoot, "website", "dist", "brand", "diagrampilot-logo-light.svg"),
    "utf8",
  );
  const html = await readFile(
    path.join(repoRoot, "website", "dist", "index.html"),
    "utf8",
  );

  assert.equal(publishedMark, canonicalMark);
  assert.equal(publishedLogo, canonicalLogo);
  assert.equal(publishedLightLogo, canonicalLightLogo);
  assert.match(
    html,
    /<link rel="(?:shortcut )?icon" href="\/brand\/diagrampilot-mark\.svg" type="image\/svg\+xml">/,
  );
  assert.doesNotMatch(html, /href="\/favicon\.svg"/);
});

test("custom landing styles keep accessibility and motion controls explicit", async () => {
  const landingCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing.css"),
    "utf8",
  );
  const workflowCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing-workflow.css"),
    "utf8",
  );
  const localPathCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing-local-path.css"),
    "utf8",
  );

  assert.match(landingCss, /:focus-visible/);
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(workflowCss, /workflow-proof/);
  assert.match(workflowCss, /demo-stage/);
  assert.match(workflowCss, /artifact-node-service/);
  assert.match(localPathCss, /repo-path-animation/);
  assert.match(landingCss, /hero-wordmark/);
  assert.match(landingCss, /\.hero-wordmark\s*{[^}]*width:\s*min\(44rem,\s*96vw\);/);
  assert.match(landingCss, /sr-only/);
  assert.match(landingCss, /image-band/);
  assert.match(landingCss, /@keyframes\s+landing-rise/);
  assert.match(landingCss, /motion-ready/);
  assert.match(landingCss, /translate3d/);
  assert.match(landingCss, /text-align:\s*center/);
  assert.match(landingCss, /body\.landing-page/);
  assert.match(landingCss, /\.hero-zone\s*{[^}]*min-height:\s*min\(96svh,\s*60rem\);/);
  assert.match(landingCss, /overflow:\s*clip/);
  assert.doesNotMatch(landingCss, /letter-spacing:\s*-/);
  assert.doesNotMatch(landingCss, /radial-gradient/);
});

test("custom website code avoids card-based landing page patterns", async () => {
  const customWebsiteFiles = await gitLsFiles([
    "website/astro.config.mjs",
    "website/scripts",
    "website/src",
  ], { split: true });

  assert.ok(customWebsiteFiles.length > 0);

  const forbiddenPatterns = [
    /\b(?:Card|CardGrid|LinkCard)\b/,
    /\b(?:feature|pricing|cta)[-_ ]?cards?\b/i,
    /\bfloating[-_ ]?panels?\b/i,
    /\bboxed[-_ ]?blurbs?\b/i,
    /class(?:Name)?=["'`][^"'`]*(?:card|panel|blurb)/i,
  ];

  for (const repoPath of customWebsiteFiles) {
    if (!(await exists(repoPath))) continue;

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
