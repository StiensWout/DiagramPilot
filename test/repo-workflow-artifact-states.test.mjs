import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";

import { checkDiagramPilotRepoWorkflow } from "../packages/core/dist/index.js";
import {
  addSvgProvenanceMetadata,
  repoWorkflowCheckOptions,
  requiredSource,
  sourcePath,
  withTempRepo,
  writeFreshSvgArtifact,
  writeSvgArtifactWithContent,
  writeValidDiagramSource,
} from "./repo-workflow-check-helpers.mjs";

test("checkDiagramPilotRepoWorkflow returns aggregate per-source results for every SVG artifact state", async () => {
  await withTempRepo(async (tempRoot) => {
    const files = {
      fresh: "01-fresh.dp.yaml",
      invalid: "02-invalid.dp.yaml",
      missingArtifact: "03-missing-artifact.dp.yaml",
      malformedArtifact: "04-malformed-artifact.dp.yaml",
      missingProvenance: "05-missing-provenance.dp.yaml",
      unreadableArtifact: "06-unreadable-artifact.dp.yaml",
      staleArtifact: "07-stale-artifact.dp.yaml",
    };

    for (const fileName of [
      files.fresh,
      files.missingArtifact,
      files.malformedArtifact,
      files.missingProvenance,
      files.unreadableArtifact,
      files.staleArtifact,
    ]) {
      await writeValidDiagramSource(sourcePath(tempRoot, fileName));
    }

    await writeFile(
      sourcePath(tempRoot, files.invalid),
      [
        "version: 1",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      "utf8",
    );

    await writeFreshSvgArtifact(
      sourcePath(tempRoot, "01-fresh.svg"),
      "docs/01-fresh.dp.yaml",
    );
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "04-malformed-artifact.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><metadata id="diagrampilot-provenance">{not json}</metadata><g /></svg>',
    );
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "05-missing-provenance.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
    );
    await mkdir(sourcePath(tempRoot, "06-unreadable-artifact.svg"), {
      recursive: true,
    });
    await writeSvgArtifactWithContent(
      sourcePath(tempRoot, "07-stale-artifact.svg"),
      addSvgProvenanceMetadata(
        '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
        {
          sourcePath: "docs/other.dp.yaml",
          sourceSha256: "old-hash",
          diagramPilotVersion: "9.9.9",
          renderer: {
            name: "other-renderer",
            version: "0.0.1",
          },
        },
      ),
    );

    const result = await checkDiagramPilotRepoWorkflow(
      repoWorkflowCheckOptions(tempRoot),
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.summary, {
      checkedSourceCount: 7,
      freshSourceCount: 1,
      issueCount: 6,
    });

    const sourcesByPath = new Map(
      result.sources.map((source) => [source.sourcePath, source]),
    );
    const fresh = requiredSource(sourcesByPath, "docs/01-fresh.dp.yaml");
    const invalid = requiredSource(sourcesByPath, "docs/02-invalid.dp.yaml");
    const missingArtifact = requiredSource(
      sourcesByPath,
      "docs/03-missing-artifact.dp.yaml",
    );
    const malformedArtifact = requiredSource(
      sourcesByPath,
      "docs/04-malformed-artifact.dp.yaml",
    );
    const missingProvenance = requiredSource(
      sourcesByPath,
      "docs/05-missing-provenance.dp.yaml",
    );
    const unreadableArtifact = requiredSource(
      sourcesByPath,
      "docs/06-unreadable-artifact.dp.yaml",
    );
    const staleArtifact = requiredSource(
      sourcesByPath,
      "docs/07-stale-artifact.dp.yaml",
    );

    assert.equal(fresh.validation.ok, true);
    assert.equal(fresh.artifact.status, "fresh");
    assert.equal(fresh.artifact.path, "docs/01-fresh.svg");
    assert.equal(
      fresh.artifact.provenance.sourcePath,
      "docs/01-fresh.dp.yaml",
    );

    assert.equal(invalid.validation.ok, false);
    assert.equal(invalid.validation.errors[0].path, "title");
    assert.equal(invalid.artifact.status, "unchecked");

    assert.deepEqual(missingArtifact.artifact, {
      status: "missing-artifact",
      path: "docs/03-missing-artifact.svg",
    });

    assert.equal(malformedArtifact.artifact.status, "malformed-artifact");
    assert.equal(
      malformedArtifact.artifact.path,
      "docs/04-malformed-artifact.svg",
    );
    assert.match(malformedArtifact.artifact.message, /json|unexpected token/i);

    assert.deepEqual(missingProvenance.artifact, {
      status: "missing-provenance",
      path: "docs/05-missing-provenance.svg",
    });

    assert.equal(unreadableArtifact.artifact.status, "unreadable-artifact");
    assert.equal(
      unreadableArtifact.artifact.path,
      "docs/06-unreadable-artifact.svg",
    );
    assert.match(unreadableArtifact.artifact.message, /EISDIR|directory/i);

    assert.equal(staleArtifact.artifact.status, "stale");
    assert.equal(staleArtifact.artifact.path, "docs/07-stale-artifact.svg");
    assert.deepEqual(staleArtifact.artifact.reasons, [
      "source-path-mismatch",
      "source-sha256-mismatch",
      "diagram-pilot-version-mismatch",
      "renderer-name-mismatch",
      "renderer-version-mismatch",
    ]);
    assert.equal(
      staleArtifact.artifact.expected.sourcePath,
      "docs/07-stale-artifact.dp.yaml",
    );
    assert.equal(
      staleArtifact.artifact.actual.sourcePath,
      "docs/other.dp.yaml",
    );
  });
});
