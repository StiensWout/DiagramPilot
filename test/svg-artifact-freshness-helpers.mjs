import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  addSvgProvenanceMetadata,
} from "../packages/render-svg/dist/index.js";

export { SVG_RENDERER_NAME, SVG_RENDERER_VERSION };

export async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-svg-artifact-freshness-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export const provenanceSourcePath = "docs/architecture.dp.yaml";
export const validSourceContent = [
  "version: 1",
  "title: Architecture",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "",
].join("\n");
export const emptySvg = '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>';

export function expectedSvgFreshnessOptions(sourcePath) {
  return {
    sourcePath,
    provenanceSourcePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  };
}

export async function writeValidDiagramSource(sourcePath) {
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, validSourceContent, "utf8");
}

export async function writeProvenanceFixture(tempRoot, provenance) {
  const sourcePath = path.join(tempRoot, "docs", "architecture.dp.yaml");
  const artifactPath = path.join(tempRoot, "docs", "architecture.svg");

  await writeValidDiagramSource(sourcePath);
  await writeFile(
    artifactPath,
    addSvgProvenanceMetadata(emptySvg, provenance),
    "utf8",
  );

  return { sourcePath, artifactPath };
}
