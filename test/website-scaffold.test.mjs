import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(repoPath) {
  return JSON.parse(await readFile(path.join(repoRoot, repoPath), "utf8"));
}

test("website is an explicit workspace outside the compiler build", async () => {
  const rootPackage = await readJson("package.json");
  const rootTsconfig = await readJson("tsconfig.json");

  assert.deepEqual(rootPackage.workspaces, ["packages/*", "website"]);
  assert.equal(
    rootPackage.scripts.build,
    "tsc -b && node packages/cli/scripts/make-bin-executable.mjs",
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
  const docsIndex = await readFile(
    path.join(repoRoot, "website", "src", "content", "docs", "index.md"),
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

  assert.match(docsIndex, /title:\s*DiagramPilot/);
  assert.match(docsIndex, /template:\s*splash/);
  assert.match(docsIndex, /tagline:\s*Repo-native diagram compiler for AI coding agents\./);

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
