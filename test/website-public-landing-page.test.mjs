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

test("public landing page presents generated product visuals", async () => {
  await websiteBuild();

  const html = await readFile(
    path.join(repoRoot, "website", "dist", "index.html"),
    "utf8",
  );

  const diagramPilotHeadings = html.match(/<h1[^>]*>\s*DiagramPilot\s*<\/h1>/g) ?? [];
  assert.equal(diagramPilotHeadings.length, 1);
  const heroStart = html.indexOf('<section class="hero-zone"');
  const artifactStart = html.indexOf("Source files become reviewable artifacts.");
  const promiseStart = html
    .slice(heroStart, artifactStart)
    .search(
      /repository files an AI coding agent can safely change,\s*validate, and commit/i,
  );
  assert.ok(heroStart >= 0);
  assert.ok(artifactStart > heroStart);
  assert.ok(promiseStart >= 0);
  assert.match(
    html,
    /repository files an AI coding agent can safely change, validate, and commit/i,
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
    /npx diagrampilot check/,
    /class="quick-command"/,
    /data-copy-command="npx diagrampilot check"/,
  ]);
  assert.match(
    html,
    /aria-label="DiagramPilot source, validation, and rendered output workflow"/,
  );
  assertMatchesAll(html, [
    /class="hero-copy motion-rise"/,
    /class="workflow-shell motion-rise motion-delay-1"/,
    /class="proof-item reveal-motion"/,
    /class="image-band reveal-motion"/,
    /IntersectionObserver/,
    /src="\/landing\/hero-workflow\.png"/,
  ]);
  assert.match(
    html,
    /Dark developer interface showing repository files, source code, terminal output, and an architecture diagram preview/,
  );
  assert.doesNotMatch(html, /\/landing\/agent-flow(?:-v2)?\.png/);
  assertMatchesAll(html, [
    /Bring your own repository\./,
    /One command before review\./,
    /If it breaks, it says where\./,
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

  assert.match(landingCss, /:focus-visible/);
  assert.match(landingCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(landingCss, /workflow-shell/);
  assert.match(landingCss, /hero-wordmark/);
  assert.match(landingCss, /\.hero-wordmark\s*{[^}]*width:\s*min\(44rem,\s*96vw\);/);
  assert.match(landingCss, /sr-only/);
  assert.match(landingCss, /image-band/);
  assert.match(landingCss, /@keyframes\s+landing-rise/);
  assert.match(landingCss, /motion-ready/);
  assert.match(landingCss, /translate3d/);
  assert.match(landingCss, /text-align:\s*center/);
  assert.match(landingCss, /body\.landing-page/);
  assert.match(landingCss, /\.hero-zone\s*{[^}]*min-height:\s*100svh;/);
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
