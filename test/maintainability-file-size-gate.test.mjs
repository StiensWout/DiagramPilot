import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MAINTAINABILITY_FILE_SIZE_GATE,
  auditMaintainabilityFileSizes,
} from "../packages/core/dist/index.js";
import { runProcess } from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const maintainabilityAuditScriptPath = path.join(
  repoRoot,
  "scripts/audit-maintainability-file-sizes.mjs",
);

async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-maintainability-gate-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeRepoFile(tempRoot, relativePath, content) {
  const filePath = path.join(tempRoot, relativePath);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function lines(count) {
  return Array.from({ length: count }, (_, index) => `line ${index + 1}`).join(
    "\n",
  );
}

async function runMaintainabilityAuditScript(cwd) {
  const { code, stdout, stderr } = await runProcess(
    process.execPath,
    [maintainabilityAuditScriptPath],
    {
      cwd,
    },
  );

  return { exitCode: code, stdout, stderr };
}

test("auditMaintainabilityFileSizes reports included authored files over the 500 LOC gate", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeRepoFile(tempRoot, "packages/core/src/index.ts", lines(501));
    await writeRepoFile(tempRoot, "test/small.test.mjs", lines(500));

    const result = await auditMaintainabilityFileSizes(tempRoot);

    assert.equal(MAINTAINABILITY_FILE_SIZE_GATE.maxLineCount, 500);
    assert.equal(result.ok, false);
    assert.deepEqual(result.violations, [
      {
        path: "packages/core/src/index.ts",
        lineCount: 501,
        maxLineCount: 500,
      },
    ]);
  });
});

test("maintainability file-size gate passes for the current repository", async () => {
  const result = await auditMaintainabilityFileSizes(repoRoot);

  assert.deepEqual(result.violations, []);
});

test("maintainability audit script exits nonzero for gate violations", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeRepoFile(tempRoot, "packages/core/src/oversized.ts", lines(501));

    const result = await runMaintainabilityAuditScript(tempRoot);

    assert.equal(result.exitCode, 1);
    assert.match(result.stdout, /Violations:/);
    assert.match(
      result.stdout,
      /packages\/core\/src\/oversized\.ts: 501 LOC \(limit 500\)/,
    );
    assert.equal(result.stderr, "");
  });
});

test("maintainability file-size gate exposes the configured include and exclude rules", () => {
  assert.deepEqual(MAINTAINABILITY_FILE_SIZE_GATE.includedPathGlobs, [
    "packages/**/*.ts",
    "test/**/*.mjs",
    "website/src/**/*",
    "website/scripts/**/*",
  ]);
  assert.match(
    MAINTAINABILITY_FILE_SIZE_GATE.excludedPathGlobs.join("\n"),
    /website\/src\/content\/docs\/\*\*/,
  );
  assert.match(
    MAINTAINABILITY_FILE_SIZE_GATE.excludedPathGlobs.join("\n"),
    /\*\*\/\*\.svg/,
  );
  assert.match(
    MAINTAINABILITY_FILE_SIZE_GATE.excludedPathGlobs.join("\n"),
    /package-lock\.json/,
  );
  assert.match(
    MAINTAINABILITY_FILE_SIZE_GATE.excludedPathGlobs.join("\n"),
    /\.scratch\/\*\*/,
  );
});

test("auditMaintainabilityFileSizes checks authored package, test, website source, and website script files", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeRepoFile(tempRoot, "packages/core/src/index.ts", lines(1));
    await writeRepoFile(tempRoot, "test/core-validation.test.mjs", lines(1));
    await writeRepoFile(tempRoot, "website/src/pages/index.astro", lines(1));
    await writeRepoFile(
      tempRoot,
      "website/scripts/sync-public-docs.mjs",
      lines(1),
    );
    await writeRepoFile(tempRoot, "docs/ignored.ts", lines(501));
    await writeRepoFile(tempRoot, "packages/core/package.json", lines(501));

    const result = await auditMaintainabilityFileSizes(tempRoot);

    assert.equal(result.ok, true);
    assert.deepEqual(
      result.checkedFiles.map((file) => file.path),
      [
        "packages/core/src/index.ts",
        "test/core-validation.test.mjs",
        "website/scripts/sync-public-docs.mjs",
        "website/src/pages/index.astro",
      ],
    );
  });
});

test("auditMaintainabilityFileSizes excludes generated output, docs, synced Starlight content, lockfiles, schema artifacts, SVGs, and vendored assets", async () => {
  await withTempRepo(async (tempRoot) => {
    await writeRepoFile(tempRoot, "website/src/pages/index.astro", lines(501));
    await writeRepoFile(tempRoot, "packages/core/dist/index.ts", lines(501));
    await writeRepoFile(
      tempRoot,
      "packages/core/src/generated/schema.ts",
      lines(501),
    );
    await writeRepoFile(
      tempRoot,
      "packages/core/src/schema.generated.ts",
      lines(501),
    );
    await writeRepoFile(tempRoot, "packages/core/src/types.d.ts", lines(501));
    await writeRepoFile(
      tempRoot,
      "website/src/content/docs/index.md.ts",
      lines(501),
    );
    await writeRepoFile(
      tempRoot,
      "website/src/content/docs/index.md",
      lines(501),
    );
    await writeRepoFile(tempRoot, "website/src/diagram.svg", lines(501));
    await writeRepoFile(tempRoot, "website/src/vendor/library.js", lines(501));
    await writeRepoFile(
      tempRoot,
      ".scratch/productization-and-maintainability/PRD.md",
      lines(501),
    );
    await writeRepoFile(
      tempRoot,
      ".scratch/productization-and-maintainability/issues/49-issue.md",
      lines(501),
    );
    await writeRepoFile(
      tempRoot,
      "schema/diagramspec-v1.schema.json",
      lines(501),
    );
    await writeRepoFile(tempRoot, "package-lock.json", lines(501));

    const result = await auditMaintainabilityFileSizes(tempRoot);

    assert.deepEqual(
      result.checkedFiles.map((file) => file.path),
      ["website/src/pages/index.astro"],
    );
    assert.deepEqual(result.violations, [
      {
        path: "website/src/pages/index.astro",
        lineCount: 501,
        maxLineCount: 500,
      },
    ]);
  });
});
