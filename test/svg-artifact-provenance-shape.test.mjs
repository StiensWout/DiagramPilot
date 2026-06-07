import assert from "node:assert/strict";
import test from "node:test";

import { checkExpectedSvgArtifactFreshness } from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  expectedSvgFreshnessOptions,
  provenanceSourcePath,
  withTempRepo,
  writeProvenanceFixture,
} from "./svg-artifact-freshness-helpers.mjs";

test("checkExpectedSvgArtifactFreshness reports valid JSON provenance with malformed shape as malformed artifact evidence", async (t) => {
  const wellShapedProvenance = {
    sourcePath: provenanceSourcePath,
    sourceSha256: "deadbeef",
    diagramPilotVersion: "0.1.0",
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  };
  const malformedShapeFixtures = [
    {
      name: "missing sourcePath",
      provenance: {
        sourceSha256: wellShapedProvenance.sourceSha256,
        diagramPilotVersion: wellShapedProvenance.diagramPilotVersion,
        renderer: wellShapedProvenance.renderer,
      },
      message: /sourcePath/i,
    },
    {
      name: "missing sourceSha256",
      provenance: {
        sourcePath: wellShapedProvenance.sourcePath,
        diagramPilotVersion: wellShapedProvenance.diagramPilotVersion,
        renderer: wellShapedProvenance.renderer,
      },
      message: /sourceSha256/i,
    },
    {
      name: "missing diagramPilotVersion",
      provenance: {
        sourcePath: wellShapedProvenance.sourcePath,
        sourceSha256: wellShapedProvenance.sourceSha256,
        renderer: wellShapedProvenance.renderer,
      },
      message: /diagramPilotVersion/i,
    },
    {
      name: "missing renderer",
      provenance: {
        sourcePath: wellShapedProvenance.sourcePath,
        sourceSha256: wellShapedProvenance.sourceSha256,
        diagramPilotVersion: wellShapedProvenance.diagramPilotVersion,
      },
      message: /renderer/i,
    },
    {
      name: "missing renderer.name",
      provenance: {
        sourcePath: wellShapedProvenance.sourcePath,
        sourceSha256: wellShapedProvenance.sourceSha256,
        diagramPilotVersion: wellShapedProvenance.diagramPilotVersion,
        renderer: {
          version: wellShapedProvenance.renderer.version,
        },
      },
      message: /renderer\.name/i,
    },
    {
      name: "missing renderer.version",
      provenance: {
        sourcePath: wellShapedProvenance.sourcePath,
        sourceSha256: wellShapedProvenance.sourceSha256,
        diagramPilotVersion: wellShapedProvenance.diagramPilotVersion,
        renderer: {
          name: wellShapedProvenance.renderer.name,
        },
      },
      message: /renderer\.version/i,
    },
    {
      name: "non-string sourcePath",
      provenance: {
        ...wellShapedProvenance,
        sourcePath: 123,
      },
      message: /sourcePath/i,
    },
    {
      name: "non-string sourceSha256",
      provenance: {
        ...wellShapedProvenance,
        sourceSha256: 123,
      },
      message: /sourceSha256/i,
    },
    {
      name: "non-string diagramPilotVersion",
      provenance: {
        ...wellShapedProvenance,
        diagramPilotVersion: 123,
      },
      message: /diagramPilotVersion/i,
    },
    {
      name: "non-string renderer.name",
      provenance: {
        ...wellShapedProvenance,
        renderer: {
          ...wellShapedProvenance.renderer,
          name: 123,
        },
      },
      message: /renderer\.name/i,
    },
    {
      name: "non-string renderer.version",
      provenance: {
        ...wellShapedProvenance,
        renderer: {
          ...wellShapedProvenance.renderer,
          version: 123,
        },
      },
      message: /renderer\.version/i,
    },
  ];

  for (const fixture of malformedShapeFixtures) {
    await t.test(fixture.name, async () => {
      await withTempRepo(async (tempRoot) => {
        const { sourcePath, artifactPath } = await writeProvenanceFixture(
          tempRoot,
          fixture.provenance,
        );

        const result = await checkExpectedSvgArtifactFreshness(
          expectedSvgFreshnessOptions(sourcePath),
        );

        assert.equal(result.sourcePath, sourcePath);
        assert.equal(result.artifactPath, artifactPath);
        assert.equal(result.status, "malformed-artifact");
        assert.match(result.message, fixture.message);
      });
    });
  }
});
