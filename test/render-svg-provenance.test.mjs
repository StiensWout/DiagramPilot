import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createSvgArtifactProvenance,
  getDiagramPilotVersion,
} from "@diagrampilot/core";
import {
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
  renderDiagramSpecToSvg,
} from "@diagrampilot/render-svg";

function sha256Hex(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("SVG provenance construction records deterministic source and renderer metadata without timestamps", () => {
  const sourcePath = "docs/architecture.dp.yaml";
  const sourceContent = [
    "version: 1",
    "title: Checkout Architecture",
    "nodes:",
    "  - id: web_app",
    "    label: Web App",
    "",
  ].join("\n");

  const provenance = createSvgRendererProvenance({
    sourcePath,
    sourceContent,
  });
  const sharedProvenance = createSvgArtifactProvenance({
    sourcePath,
    sourceContent,
    renderer: {
      name: "@terrastruct/d2",
      version: "0.1.33",
    },
  });
  const repeatedProvenance = createSvgRendererProvenance({
    sourcePath,
    sourceContent,
  });

  assert.deepEqual(provenance, {
    sourcePath,
    sourceSha256: sha256Hex(sourceContent),
    diagramPilotVersion: getDiagramPilotVersion(),
    renderer: {
      name: "@terrastruct/d2",
      version: "0.1.33",
    },
  });
  assert.deepEqual(provenance, sharedProvenance);
  assert.deepEqual(repeatedProvenance, provenance);
  assert.doesNotMatch(
    JSON.stringify(provenance),
    /timestamp|renderedAt|createdAt|date/iu,
  );
});

test("SVG provenance construction stores repo-style source paths", () => {
  const sourceContent = "version: 1\n";

  const provenance = createSvgRendererProvenance({
    sourcePath: String.raw`docs\architecture.dp.yaml`,
    sourceContent,
  });

  assert.equal(provenance.sourcePath, "docs/architecture.dp.yaml");
});

test("SVG provenance insertion writes metadata after the opening svg tag without rendering through D2", () => {
  const sourceContent = "version: 1\n";
  const provenance = createSvgRendererProvenance({
    sourcePath: "docs/architecture.dp.yaml",
    sourceContent,
  });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>';

  const withProvenance = addSvgProvenanceMetadata(svg, provenance);

  assert.equal(
    withProvenance,
    `<svg xmlns="http://www.w3.org/2000/svg"><metadata id="diagrampilot-provenance">${JSON.stringify(
      provenance,
    )}</metadata><g></g></svg>`,
  );
});

test("renderDiagramSpecToSvg applies output profiles to rendered SVG output", async () => {
  const spec = {
    version: 1,
    title: "Architecture",
    nodes: [{ id: "web_app", label: "Web App" }],
  };

  const clean = await renderDiagramSpecToSvg(spec);
  const presentation = await renderDiagramSpecToSvg(spec, {
    profile: "presentation",
  });

  assert.match(clean, /<svg\b/);
  assert.match(presentation, /<svg\b/);
  assert.notEqual(presentation, clean);
});
