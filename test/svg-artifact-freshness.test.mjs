import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  checkExpectedSvgArtifactFreshness,
  checkExpectedSvgArtifactFreshnessForValidatedSource,
} from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";
import {
  emptySvg,
  expectedSvgFreshnessOptions,
  writeProvenanceFixture,
  writeValidArchitectureSource,
  provenanceSourcePath,
  validSourceContent,
  withTempRepo,
} from "./svg-artifact-freshness-helpers.mjs";

function assertSvgArtifactStatus(result, { sourcePath, artifactPath, status }) {
  assert.equal(result.sourcePath, sourcePath);
  assert.equal(result.artifactPath, artifactPath);
  assert.equal(result.status, status);
}

function checkExpectedFreshnessForSource(sourcePath) {
  return checkExpectedSvgArtifactFreshness(
    expectedSvgFreshnessOptions(sourcePath),
  );
}

async function assertMalformedArtifact({
  tempRoot,
  artifactContent,
  messagePattern,
}) {
  const { sourcePath, artifactPath } = await writeValidArchitectureSource(
    tempRoot,
  );

  await writeFile(artifactPath, artifactContent, "utf8");
  const result = await checkExpectedFreshnessForSource(sourcePath);

  assertSvgArtifactStatus(result, {
    sourcePath,
    artifactPath,
    status: "malformed-artifact",
  });
  assert.match(result.message, messagePattern);
}

test("checkExpectedSvgArtifactFreshness returns fresh for a next-to-source SVG with matching provenance", async () => {
  await withTempRepo(async (tempRoot) => {
    const provenance = createSvgRendererProvenance({
      sourcePath: provenanceSourcePath,
      sourceContent: validSourceContent,
    });
    const { sourcePath, artifactPath } = await writeProvenanceFixture(
      tempRoot,
      provenance,
    );

    const result = await checkExpectedFreshnessForSource(sourcePath);

    assert.deepEqual(result, {
      sourcePath,
      artifactPath,
      status: "fresh",
      provenance,
    });
  });
});

test("checkExpectedSvgArtifactFreshnessForValidatedSource computes expected provenance from supplied source context", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");
    const suppliedSourceContent = [
      "version: 1",
      "title: Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n");

    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "this on-disk content is not used\n", "utf8");
    const provenance = createSvgRendererProvenance({
      sourcePath: provenanceSourcePath,
      sourceContent: suppliedSourceContent,
    });

    await writeFile(
      artifactPath,
      addSvgProvenanceMetadata(emptySvg, provenance),
      "utf8",
    );

    const result = await checkExpectedSvgArtifactFreshnessForValidatedSource({
      source: {
        format: "yaml",
        path: sourcePath,
        content: suppliedSourceContent,
        value: {
          version: 1,
          title: "Architecture",
          nodes: [{ id: "web_app", label: "Web App" }],
        },
      },
      provenanceSourcePath,
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assert.deepEqual(result, {
      sourcePath,
      artifactPath,
      status: "fresh",
      provenance,
    });
  });
});

test("checkExpectedSvgArtifactFreshness reports a missing expected SVG artifact separately from stale artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, artifactPath } = await writeValidArchitectureSource(tempRoot);

    const result = await checkExpectedSvgArtifactFreshness({
      sourcePath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assert.deepEqual(result, {
      sourcePath,
      artifactPath,
      status: "missing-artifact",
    });
  });
});

test("checkExpectedSvgArtifactFreshness reports an unreadable expected SVG artifact separately from missing artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, artifactPath } = await writeValidArchitectureSource(tempRoot);
    await mkdir(artifactPath, { recursive: true });

    const result = await checkExpectedSvgArtifactFreshness({
      sourcePath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assertSvgArtifactStatus(result, {
      sourcePath,
      artifactPath,
      status: "unreadable-artifact",
    });
    assert.match(result.message, /EISDIR|directory/i);
  });
});

test("checkExpectedSvgArtifactFreshness reports missing DiagramPilot provenance separately from stale artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    const { sourcePath, artifactPath } = await writeValidArchitectureSource(tempRoot);
    await writeFile(
      artifactPath,
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
      "utf8",
    );

    const result = await checkExpectedSvgArtifactFreshness({
      sourcePath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assert.deepEqual(result, {
      sourcePath,
      artifactPath,
      status: "missing-provenance",
    });
  });
});

test("checkExpectedSvgArtifactFreshness leaves artifact freshness unchecked for an invalid DiagramPilot source file", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");

    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, "not valid diagramspec content\n", "utf8");
    await writeFile(
      artifactPath,
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
      "utf8",
    );

    const result = await checkExpectedSvgArtifactFreshness({
      sourcePath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assertSvgArtifactStatus(result, {
      sourcePath,
      artifactPath,
      status: "unchecked",
    });
    assert.match(result.validationFailure.kind, /^(parse|validation)$/);
  });
});

test("checkExpectedSvgArtifactFreshness reports malformed DiagramPilot provenance separately from stale artifacts", async () => {
  await withTempRepo(async (tempRoot) => {
    await assertMalformedArtifact({
      tempRoot,
      artifactContent:
        '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="diagrampilot-provenance">{not json}</metadata><g /></svg>',
      messagePattern: /json|unexpected token|expected property name/i,
    });
  });
});

test("checkExpectedSvgArtifactFreshness reports malformed SVG separately from missing provenance", async () => {
  await withTempRepo(async (tempRoot) => {
    await assertMalformedArtifact({
      tempRoot,
      artifactContent: "not actually svg\n",
      messagePattern: /svg/i,
    });
  });
});

test("checkExpectedSvgArtifactFreshness reports stale provenance with explicit mismatch reasons", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
    const artifactPath = path.join(tempRoot, "docs", "architecture.svg");
    const sourceContent = [
      "version: 1",
      "title: Architecture",
      "nodes:",
      "  - id: web_app",
      "    label: Web App",
      "",
    ].join("\n");

    await mkdir(path.dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, sourceContent, "utf8");

    const actualProvenance = {
      sourcePath: "docs/other.dp.yaml",
      sourceSha256: "deadbeef",
      diagramPilotVersion: "9.9.9",
      renderer: {
        name: "other-renderer",
        version: "2.0.0",
      },
    };

    await writeFile(
      artifactPath,
      addSvgProvenanceMetadata(
        '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
        actualProvenance,
      ),
      "utf8",
    );

    const result = await checkExpectedSvgArtifactFreshness({
      sourcePath,
      provenanceSourcePath: "docs/architecture.dp.yaml",
      renderer: {
        name: SVG_RENDERER_NAME,
        version: SVG_RENDERER_VERSION,
      },
    });

    assertSvgArtifactStatus(result, {
      sourcePath,
      artifactPath,
      status: "stale",
    });
    assert.deepEqual(result.reasons, [
      "source-path-mismatch",
      "source-sha256-mismatch",
      "diagram-pilot-version-mismatch",
      "renderer-name-mismatch",
      "renderer-version-mismatch",
    ]);
    assert.equal(result.actual.sourcePath, actualProvenance.sourcePath);
    assert.equal(result.actual.sourceSha256, actualProvenance.sourceSha256);
    assert.equal(result.actual.diagramPilotVersion, actualProvenance.diagramPilotVersion);
    assert.equal(result.actual.renderer.name, actualProvenance.renderer.name);
    assert.equal(result.actual.renderer.version, actualProvenance.renderer.version);
    assert.equal(result.expected.sourcePath, "docs/architecture.dp.yaml");
    assert.equal(result.expected.renderer.name, SVG_RENDERER_NAME);
    assert.equal(result.expected.renderer.version, SVG_RENDERER_VERSION);
  });
});
