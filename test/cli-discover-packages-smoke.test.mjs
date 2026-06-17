import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertCliSucceeded,
  findFilesMatching,
  runBuiltCli,
  withTempRepo,
} from "./cli-smoke-helpers.mjs";

async function writePackageManifest(tempRoot, relativePath, manifest) {
  await writeFile(
    path.join(tempRoot, relativePath),
    JSON.stringify(manifest, null, 2),
  );
}

async function runDiscoverPackagesJson(tempRoot) {
  const result = await runBuiltCli(["discover", "packages", "--json"], tempRoot);

  assertCliSucceeded(result);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.equal(payload.target, "packages");

  return payload;
}

async function writeDiscoverFixtureRepo(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await mkdir(path.join(tempRoot, "src"), { recursive: true });
  await writeFile(path.join(tempRoot, "src", "app.ts"), "export {}\n");
  await writeFile(path.join(tempRoot, "package.json"), '{"name":"fixture"}\n');
  await writeFile(
    path.join(tempRoot, ".gitignore"),
    ["generated/**", "tmp.ts", ""].join("\n"),
  );
  await writeFile(
    path.join(tempRoot, "diagrampilot.config.yaml"),
    [
      "version: 1",
      "discovery:",
      "  preset: monorepo",
      "sources:",
      "  ignore:",
      "    - fixtures/**",
      "",
    ].join("\n"),
  );
}

async function writePackageDiscoveryWorkspace(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await mkdir(path.join(tempRoot, "packages", "api"), { recursive: true });
  await mkdir(path.join(tempRoot, "packages", "shared"), { recursive: true });
  await writePackageManifest(tempRoot, "package.json", {
    name: "workspace-root",
    version: "1.0.0",
    private: true,
    packageManager: "npm@11.16.0",
    workspaces: ["packages/*"],
    scripts: {
      build: "npm -ws run build",
      test: "node --test",
    },
    devDependencies: {
      typescript: "^6.0.3",
    },
  });
  await writePackageManifest(tempRoot, "packages/api/package.json", {
    name: "@fixture/api",
    version: "0.1.0",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc -b",
    },
    dependencies: {
      "@fixture/shared": "workspace:*",
      react: "^19.0.0",
    },
    devDependencies: {
      tsx: "^5.0.0",
    },
  });
  await writePackageManifest(tempRoot, "packages/shared/package.json", {
    name: "@fixture/shared",
    version: "0.1.0",
    exports: {
      ".": "./src/index.ts",
    },
    scripts: {
      build: "tsc -b",
    },
    peerDependencies: {
      react: "^19.0.0",
    },
  });
}

async function writeSinglePackageRepo(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await writePackageManifest(tempRoot, "package.json", {
    name: "single-package",
    version: "2.0.0",
    main: "index.js",
    module: "index.mjs",
    types: "index.d.ts",
    scripts: {
      test: "node --test",
      build: "tsc -b",
    },
    dependencies: {
      express: "^5.0.0",
    },
    optionalDependencies: {
      sharp: "^0.34.0",
    },
  });
}

async function writeIgnoredWorkspaceRepo(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await mkdir(path.join(tempRoot, "packages", "kept"), { recursive: true });
  await mkdir(path.join(tempRoot, "generated", "ignored"), { recursive: true });
  await writeFile(path.join(tempRoot, ".gitignore"), "generated/**\n");
  await writePackageManifest(tempRoot, "package.json", {
    name: "ignore-workspaces",
    private: true,
    workspaces: ["packages/*", "generated/*"],
  });
  await writePackageManifest(tempRoot, "packages/kept/package.json", {
    name: "@fixture/kept",
  });
  await writePackageManifest(tempRoot, "generated/ignored/package.json", {
    name: "@fixture/ignored",
  });
}

async function writeUnsupportedPackageManagerRepo(tempRoot) {
  await mkdir(path.join(tempRoot, ".git"));
  await writePackageManifest(tempRoot, "package.json", {
    name: "unsupported-package-manager",
    packageManager: "pnpm@9.0.0",
    workspaces: "packages/*",
  });
}

test("diagrampilot discover packages --json reports effective options without writing files", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeDiscoverFixtureRepo(tempRoot);
    const beforeFiles = await findFilesMatching(tempRoot, tempRoot, /./u);

    const payload = await runDiscoverPackagesJson(tempRoot);

    assert.equal(payload.preset, "monorepo");
    assert.equal(payload.readOnly, true);
    assert.deepEqual(payload.include, [
      "package.json",
      "packages/*/package.json",
    ]);
    assert.deepEqual(payload.ignoreSources.slice(1), [
      {
        source: "gitignore",
        path: ".gitignore",
        patterns: ["generated/**", "tmp.ts"],
      },
      {
        source: "config",
        path: "diagrampilot.config.yaml",
        patterns: ["fixtures/**"],
      },
    ]);

    const afterFiles = await findFilesMatching(tempRoot, tempRoot, /./u);
    assert.deepEqual(afterFiles, beforeFiles);
  });
});

test("diagrampilot discover packages --json reports npm workspace package relationships", async () => {
  await withTempRepo(async (tempRoot) => {
    await writePackageDiscoveryWorkspace(tempRoot);

    const payload = await runDiscoverPackagesJson(tempRoot);

    assert.deepEqual(payload.rootPackage, {
      path: ".",
      manifestPath: "package.json",
      name: "workspace-root",
      version: "1.0.0",
      private: true,
      packageManager: "npm@11.16.0",
      workspace: false,
      scripts: ["build", "test"],
      entrypoints: {
        main: null,
        module: null,
        types: null,
        exports: false,
      },
      dependencies: {
        dependencies: [],
        devDependencies: ["typescript"],
        peerDependencies: [],
        optionalDependencies: [],
      },
    });
    assert.deepEqual(payload.workspacePackages, [
      {
        path: "packages/api",
        manifestPath: "packages/api/package.json",
        name: "@fixture/api",
        version: "0.1.0",
        private: null,
        packageManager: null,
        workspace: true,
        scripts: ["build"],
        entrypoints: {
          main: "dist/index.js",
          module: null,
          types: "dist/index.d.ts",
          exports: false,
        },
        dependencies: {
          dependencies: ["@fixture/shared", "react"],
          devDependencies: ["tsx"],
          peerDependencies: [],
          optionalDependencies: [],
        },
      },
      {
        path: "packages/shared",
        manifestPath: "packages/shared/package.json",
        name: "@fixture/shared",
        version: "0.1.0",
        private: null,
        packageManager: null,
        workspace: true,
        scripts: ["build"],
        entrypoints: {
          main: null,
          module: null,
          types: null,
          exports: true,
        },
        dependencies: {
          dependencies: [],
          devDependencies: [],
          peerDependencies: ["react"],
          optionalDependencies: [],
        },
      },
    ]);
    assert.deepEqual(payload.dependencyEdges, [
      {
        from: "workspace-root",
        dependency: "typescript",
        to: null,
        kind: "external",
        dependencySet: "devDependencies",
      },
      {
        from: "@fixture/api",
        dependency: "@fixture/shared",
        to: "@fixture/shared",
        kind: "internal",
        dependencySet: "dependencies",
      },
      {
        from: "@fixture/api",
        dependency: "react",
        to: null,
        kind: "external",
        dependencySet: "dependencies",
      },
      {
        from: "@fixture/api",
        dependency: "tsx",
        to: null,
        kind: "external",
        dependencySet: "devDependencies",
      },
      {
        from: "@fixture/shared",
        dependency: "react",
        to: null,
        kind: "external",
        dependencySet: "peerDependencies",
      },
    ]);
    assert.deepEqual(payload.diagnostics, []);
  });
});

test("diagrampilot discover packages --json reports deterministic single-package repos", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeSinglePackageRepo(tempRoot);

    const payload = await runDiscoverPackagesJson(tempRoot);

    assert.deepEqual(payload.workspacePackages, []);
    assert.deepEqual(payload.rootPackage, {
      path: ".",
      manifestPath: "package.json",
      name: "single-package",
      version: "2.0.0",
      private: null,
      packageManager: null,
      workspace: false,
      scripts: ["build", "test"],
      entrypoints: {
        main: "index.js",
        module: "index.mjs",
        types: "index.d.ts",
        exports: false,
      },
      dependencies: {
        dependencies: ["express"],
        devDependencies: [],
        peerDependencies: [],
        optionalDependencies: ["sharp"],
      },
    });
    assert.deepEqual(payload.dependencyEdges, [
      {
        from: "single-package",
        dependency: "express",
        to: null,
        kind: "external",
        dependencySet: "dependencies",
      },
      {
        from: "single-package",
        dependency: "sharp",
        to: null,
        kind: "external",
        dependencySet: "optionalDependencies",
      },
    ]);
    assert.deepEqual(payload.diagnostics, []);
  });
});

test("diagrampilot discover packages --json excludes ignored workspace manifests", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeIgnoredWorkspaceRepo(tempRoot);

    const payload = await runDiscoverPackagesJson(tempRoot);

    assert.deepEqual(
      payload.workspacePackages.map((packageSummary) => packageSummary.name),
      ["@fixture/kept"],
    );
    assert.deepEqual(payload.diagnostics, []);
  });
});

test("diagrampilot discover packages --json reports unsupported package workspace diagnostics", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeUnsupportedPackageManagerRepo(tempRoot);

    const payload = await runDiscoverPackagesJson(tempRoot);

    assert.equal(payload.rootPackage.name, "unsupported-package-manager");
    assert.deepEqual(payload.workspacePackages, []);
    assert.deepEqual(
      payload.diagnostics.map((diagnostic) => diagnostic.code),
      ["unsupported-package-manager", "unsupported-workspace-declaration"],
    );
  });
});
