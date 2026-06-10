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

test("website is a static Astro Starlight shell", async () => {
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
  const landingPage = await readFile(
    path.join(repoRoot, "website", "src", "pages", "index.astro"),
    "utf8",
  );
  const websiteGitignore = await readFile(
    path.join(repoRoot, "website", ".gitignore"),
    "utf8",
  );

  assert.equal(websitePackage.name, "@diagrampilot/website");
  assert.equal(websitePackage.private, true);
  assert.equal(websitePackage.type, "module");
  assert.equal(websitePackage.scripts.build, "astro build");
  assert.equal(dependencies.astro, "^6.4.4");
  assert.equal(dependencies["@astrojs/starlight"], "^0.39.3");
  assert.equal(websiteTsconfig.extends, "../node_modules/astro/tsconfigs/strict.json");

  assert.match(astroConfig, /output:\s*"static"/);
  assert.match(astroConfig, /starlight\(\{/);
  assert.match(astroConfig, /title:\s*"DiagramPilot"/);

  assert.match(contentConfig, /docsLoader\(\)/);
  assert.match(contentConfig, /docsSchema\(\)/);

  assert.match(landingPage, /<body class="landing-page">/);
  assert.match(
    landingPage,
    /<h1 id="landing-title" class="sr-only">DiagramPilot<\/h1>/,
  );
  assert.match(landingPage, /class="hero-wordmark"/);
  assert.match(landingPage, /src="\/brand\/diagrampilot-logo-light\.svg"/);
  assert.match(
    landingPage,
    /Diagrams are repository files an AI coding agent can safely change,\s+validate, and commit\./,
  );

  assert.match(websiteGitignore, /^\/dist\/$/m);

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
