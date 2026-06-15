import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./website-test-helpers.mjs";


async function readJson(repoPath) {
  return JSON.parse(await readFile(path.join(repoRoot, repoPath), "utf8"));
}

test("website is an explicit workspace outside the compiler build", async () => {
  const rootPackage = await readJson("package.json");
  const rootTsconfig = await readJson("tsconfig.json");

  assert.deepEqual(rootPackage.workspaces, ["packages/*", "website"]);
  assert.equal(
    rootPackage.scripts.build,
    "tsc -b && node packages/cli/scripts/make-bin-executable.mjs && node packages/mcp/scripts/make-bin-executable.mjs",
  );
  assert.equal(
    rootPackage.scripts["build:website"],
    "npm --workspace website run build",
  );
  assert.ok(
    rootTsconfig.references.every((reference) => reference.path !== "./website"),
    "website should not be part of the root TypeScript project references",
  );
});

test("website uses Astro for public docs and Vite React for the landing page", async () => {
  const websitePackage = await readJson("website/package.json");
  const websiteTsconfig = await readJson("website/tsconfig.json");
  const dependencies = {
    ...websitePackage.dependencies,
    ...websitePackage.devDependencies,
  };
  const astroConfig = await readFile(
    path.join(repoRoot, "website", "astro.config.mjs"),
    "utf8",
  );
  const contentConfig = await readFile(
    path.join(repoRoot, "website", "src", "content.config.ts"),
    "utf8",
  );
  const viteConfig = await readFile(
    path.join(repoRoot, "website", "vite.config.ts"),
    "utf8",
  );
  const landingTemplate = await readFile(
    path.join(repoRoot, "website", "index.html"),
    "utf8",
  );
  const landingEntry = await readFile(
    path.join(repoRoot, "website", "src", "main.tsx"),
    "utf8",
  );
  const landingRouter = await readFile(
    path.join(repoRoot, "website", "src", "landing", "router.tsx"),
    "utf8",
  );
  const landingPage = await readFile(
    path.join(repoRoot, "website", "src", "landing", "LandingPage.tsx"),
    "utf8",
  );
  const workflowDemo = await readFile(
    path.join(repoRoot, "website", "src", "landing", "WorkflowDemo.tsx"),
    "utf8",
  );
  const localRepositoryPath = await readFile(
    path.join(repoRoot, "website", "src", "landing", "LocalRepositoryPath.tsx"),
    "utf8",
  );
  const renderLandingScript = await readFile(
    path.join(repoRoot, "website", "scripts", "render-landing.mjs"),
    "utf8",
  );
  const implementationNotes = await readFile(
    path.join(repoRoot, "website", "IMPLEMENTATION_NOTES.md"),
    "utf8",
  );
  const websiteGitignore = await readFile(
    path.join(repoRoot, "website", ".gitignore"),
    "utf8",
  );
  const visualQualityScript = await readFile(
    path.join(repoRoot, "website", "scripts", "check-visual-quality.mjs"),
    "utf8",
  );

  assert.equal(websitePackage.name, "@diagrampilot/website");
  assert.equal(websitePackage.private, true);
  assert.equal(websitePackage.type, "module");
  assert.equal(
    websitePackage.scripts.build,
    "npm run build:docs && npm run build:landing && npm run build:landing:ssr && node scripts/render-landing.mjs",
  );
  assert.equal(websitePackage.scripts["build:docs"], "astro build");
  assert.equal(websitePackage.scripts["build:landing"], "vite build");
  assert.equal(
    websitePackage.scripts["build:landing:ssr"],
    "vite build --ssr src/landing/ssr.tsx --outDir dist/.vite-ssr",
  );
  assert.equal(dependencies.astro, "^6.4.4");
  assert.equal(dependencies["@astrojs/starlight"], "^0.39.3");
  assert.ok(dependencies.vite);
  assert.ok(dependencies["@vitejs/plugin-react"]);
  assert.ok(dependencies["@tanstack/react-router"]);
  assert.ok(dependencies["@vercel/analytics"]);
  assert.ok(dependencies.react);
  assert.ok(dependencies["react-dom"]);
  assert.equal(websiteTsconfig.extends, "../node_modules/astro/tsconfigs/strict.json");

  assert.match(astroConfig, /output:\s*"static"/);
  assert.match(astroConfig, /starlight\(\{/);
  assert.match(astroConfig, /title:\s*"DiagramPilot"/);

  assert.match(contentConfig, /docsLoader\(\)/);
  assert.match(contentConfig, /docsSchema\(\)/);

  assert.match(viteConfig, /@vitejs\/plugin-react/);
  assert.match(viteConfig, /emptyOutDir:\s*false/);
  assert.match(landingTemplate, /<body class="landing-page">/);
  assert.match(landingTemplate, /<div id="root"><!--app-html--><\/div>/);
  assert.match(landingEntry, /hydrateRoot/);
  assert.match(landingEntry, /from "\.\/landing\/App"/);
  assert.match(landingRouter, /@tanstack\/react-router/);
  assert.match(landingRouter, /createRootRoute/);
  assert.match(landingRouter, /createRouter/);
  assert.match(landingRouter, /RouterProvider/);
  assert.match(renderLandingScript, /renderLandingPage/);
  assert.match(renderLandingScript, /<!--app-html-->/);
  assert.match(implementationNotes, /TanStack Router and Vite React/);
  assert.match(
    implementationNotes,
    /accounts, paid tiers, or app functionality/i,
  );
  assert.match(implementationNotes, /future framework reassessment/i);
  assert.match(
    landingPage,
    /<h1 id="landing-title" className="sr-only">/,
  );
  assert.match(landingPage, /className="hero-wordmark"/);
  assert.match(landingPage, /src="\/brand\/diagrampilot-logo-light\.svg"/);
  assert.match(
    landingPage,
    /Commit diagrams like code: `\.dp\.yaml` source in the repo,\s+local\s+checks before review, and SVG artifacts maintainers can inspect\./,
  );
  assert.match(landingPage, /import \{ WorkflowDemo \}/);
  assert.match(landingPage, /import \{ LocalRepositoryPath \}/);
  assert.match(landingPage, /<WorkflowDemo \/>/);
  assert.match(landingPage, /<LocalRepositoryPath \/>/);
  assert.match(workflowDemo, /id="workflow-proof"/);
  assert.match(workflowDemo, /data-demo-control=\{step\.id\}/);
  assert.match(workflowDemo, /artifact-node-service/);
  assert.match(localRepositoryPath, /repo-path-animation/);
  assert.match(localRepositoryPath, /data-path-step/);

  assert.match(websiteGitignore, /^\/dist\/$/m);
  assert.match(websiteGitignore, /^\/visual-quality-report\/$/m);
  assert.match(visualQualityScript, /path\.join\(websiteRoot, "visual-quality-report"\)/);
  assert.doesNotMatch(visualQualityScript, /\.scratch|productization-and-maintainability/);

  for (const forbiddenDependency of [
    "@astrojs/cloudflare",
    "@astrojs/db",
    "@astrojs/netlify",
    "@astrojs/node",
    "@astrojs/vercel",
    "@vercel/blob",
    "firebase",
    "supabase",
  ]) {
    assert.equal(
      dependencies[forbiddenDependency],
      undefined,
      `${forbiddenDependency} should not be a website dependency`,
    );
  }
});
