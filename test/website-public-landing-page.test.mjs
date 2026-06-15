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
  const landingCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing.css"),
    "utf8",
  );

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
  ]);
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/);

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

test("public landing page is rendered by the Vite React router with analytics", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /<div id="root">/,
    /data-router-provider="tanstack"/,
    /DiagramPilot \| Repo-Native Diagrams For AI Coding Agents/,
    /aria-label="GitHub repository"/,
    /aria-label="npm package"/,
    /github-icon/,
    /npm-icon/,
  ]);
  assert.equal(
    await exists("website/src/pages/index.astro"),
    false,
    "the landing page should not be implemented as an Astro page",
  );
  assert.equal(
    await exists("website/src/main.tsx"),
    true,
    "Vite should mount the React landing app from src/main.tsx",
  );
  assert.equal(
    await exists("website/src/landing/router.tsx"),
    true,
    "TanStack Router should own the landing route tree",
  );

  const routerSource = await readFile(
    path.join(repoRoot, "website", "src", "landing", "router.tsx"),
    "utf8",
  );
  const appSource = await readFile(
    path.join(repoRoot, "website", "src", "landing", "App.tsx"),
    "utf8",
  );

  assertMatchesAll(routerSource, [
    /@tanstack\/react-router/,
    /createRootRoute/,
    /createRouter/,
    /RouterProvider/,
  ]);
  assertMatchesAll(appSource, [
    /@vercel\/analytics\/react/,
    /<Analytics\s*\/>/,
  ]);
  assert.doesNotMatch(appSource, /\btrack\s*\(/);
  assert.doesNotMatch(appSource, /beforeSend/);
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
    /<h2>Start\.<\/h2>/,
    /href="https:\/\/www\.npmjs\.com\/package\/diagrampilot"/,
    /npm package/,
    /href="\/docs\/agents\/agent-workflow\/"/,
    />Workflow<\/span>/,
    /href="\/docs\/agents\/installation\/"/,
    /href="\/docs\/agents\/quickstart\/"/,
    /href="https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
  ]);
  assert.doesNotMatch(html, /Start with the checkout demo\./);
});

test("public landing page reflects the shipped authoring surface", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /diagrampilot create/,
    /diagrampilot inspect/,
    /diagrampilot format/,
    /diagrampilot watch/,
    /Output Profiles/,
    /DiagramSpec/,
    /MCP usage/,
    /diagrampilot-mcp/,
  ]);
  assert.doesNotMatch(html, /Manual Milestone Release|v0\.4/i);
});

test("public landing page publishes search and social metadata for developer discovery", async () => {
  const html = await readBuiltLandingPage();

  assertMatchesAll(html, [
    /<title>DiagramPilot \| Repo-Native Diagrams For AI Coding Agents<\/title>/,
    /name="description"\s+content="DiagramPilot turns \.dp\.yaml source files into review-stable SVG artifacts with local validation for AI coding agents and software repository reviews\."/,
    /name="robots"\s+content="index, follow"/,
    /name="theme-color"\s+content="#0f172a"/,
    /rel="canonical"\s+href="https:\/\/diagrampilot\.com\/"/,
    /property="og:site_name"\s+content="DiagramPilot"/,
    /property="og:locale"\s+content="en_US"/,
    /property="og:image"\s+content="https:\/\/diagrampilot\.com\/landing\/hero-workflow\.png"/,
    /name="twitter:image:alt"\s+content="DiagramPilot repository workflow showing source, validation, and SVG output\."/,
    /type="application\/ld\+json"/,
    /"@type":\s*"SoftwareApplication"/,
    /"applicationCategory":\s*"DeveloperApplication"/,
    /"codeRepository":\s*"https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
  ]);
});

test("public landing page presents generated product visuals", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "index.html"),
    "utf8",
  );
  const landingSource = await readFile(
    path.join(repoRoot, "website", "src", "landing", "LandingPage.tsx"),
    "utf8",
  );

  const diagramPilotHeadings = html.match(/<h1[^>]*>\s*DiagramPilot\s*<\/h1>/g) ?? [];
  assert.equal(diagramPilotHeadings.length, 1);
  const heroStart = html.indexOf('<section class="hero-zone"');
  const proofStart = html.indexOf('id="workflow-proof"');
  const promiseStart = html
    .slice(heroStart, proofStart)
    .search(/Source in the repo\.\s*SVG out for review\./i);
  assert.ok(heroStart >= 0);
  assert.ok(proofStart > heroStart);
  assert.ok(promiseStart >= 0);
  assert.match(
    html,
    /Source in the repo\.\s*SVG out for review\./i,
  );
  assert.match(
    html,
    /<img[^>]+class="hero-wordmark"[^>]+src="\/brand\/diagrampilot-logo-light\.svg"[^>]+alt=""/,
  );
  assertMatchesAll(html, [
    /Local diagrams for agents/,
    /class="hero-signals"/,
    /\.dp\.yaml/,
    />source<\/dd>/,
    />validate<\/dd>/,
    />review<\/dd>/,
    /GitHub repository/,
    /href="https:\/\/github\.com\/StiensWout\/DiagramPilot"/,
    /href="\/docs\/agents\/quickstart\/"/,
    /href="\/docs\/"/,
    /href="#workflow-proof"/,
    />Workflow<\/a>/,
    />Install<\/a>/,
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
  ]);
  assertMatchesAll(landingSource, [/IntersectionObserver/, /motion-ready/]);
  assert.doesNotMatch(html, /class="workflow-shell/);
  assert.doesNotMatch(html, /\/landing\/agent-flow(?:-v2)?\.png/);
  assertMatchesAll(html, [
    /<h2[^>]*>\s*Source to SVG\.\s*<\/h2>/,
    /One checkout\.\s*One reviewable artifact\./,
    /<h2>\s*Local\s*<\/h2>/,
    /<h2>\s*Checked\s*<\/h2>/,
    /<h2>\s*Repairable\s*<\/h2>/,
    /<h2[^>]*>\s*Repo to SVG\.\s*<\/h2>/,
    /<h2>\s*Start\.\s*<\/h2>/,
  ]);
  assert.doesNotMatch(html, /Product summary/);
  assert.doesNotMatch(
    html,
    /Commit diagrams like code|Bring your own repository|One command before review|If it breaks, it says where|From `\.dp\.yaml` to review-stable SVG without leaving the repo|Source files become reviewable artifacts/i,
  );
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
    /SVG out for review/i,
    /repairable validation errors/i,
    /Agent-ready/i,
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
    /<link rel="(?:shortcut )?icon"\s+href="\/brand\/diagrampilot-mark\.svg"\s+type="image\/svg\+xml"\s*\/?>/,
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
  const mobileCss = await readFile(
    path.join(repoRoot, "website", "src", "styles", "landing-mobile.css"),
    "utf8",
  );

  assertMatchesAll(landingCss, [
    /:focus-visible/,
    /prefers-reduced-motion:\s*reduce/,
    /hero-wordmark/,
    /\.hero-wordmark\s*{[^}]*width:\s*min\(44rem,\s*96vw\);/,
    /sr-only/,
    /image-band/,
    /@keyframes\s+landing-rise/,
    /motion-ready/,
    /translate3d/,
    /text-align:\s*center/,
    /body\.landing-page/,
    /\.hero-zone\s*{[^}]*min-height:\s*min\(96svh,\s*60rem\);/,
    /overflow:\s*clip/,
  ]);
  assertMatchesAll(workflowCss, [
    /workflow-proof/,
    /demo-stage/,
    /artifact-node-service/,
    /\.demo-step code\s*{[^}]*display:\s*none;/,
    /\.demo-workspace\s*{[^}]*display:\s*flex;/,
    /\.demo-output\s*{[^}]*order:\s*1;/,
    /\.demo-svg\s*{[^}]*min-height:\s*0;/,
  ]);
  assertMatchesAll(localPathCss, [
    /repo-path-animation/,
    /\.repo-path-animation li\s*{[^}]*min-height:\s*3\.25rem;/,
  ]);
  assertMatchesAll(mobileCss, [
    /\.hero-wordmark\s*{[^}]*width:\s*min\(22rem,\s*92vw\);/,
    /\.hero-zone\s*{[^}]*min-height:\s*auto;/,
    /\.final-cta \.hero-actions\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
  ]);
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
