import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  addSvgProvenanceMetadata,
  createSvgRendererProvenance,
} from "../packages/render-svg/dist/index.js";

export { SVG_RENDERER_NAME, SVG_RENDERER_VERSION, addSvgProvenanceMetadata };

export async function withTempRepo(run) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-repo-workflow-check-"),
  );

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function repoWorkflowCheckOptions(scopePath) {
  return {
    scopePath,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  };
}

export function validSourceContext(sourcePath = "/repo/docs/architecture.dp.yaml") {
  return {
    format: "yaml",
    path: sourcePath,
    content: "version: 1\ntitle: Architecture\nnodes:\n  - id: web_app\n    label: Web App\n",
    value: {
      version: 1,
      title: "Architecture",
      nodes: [{ id: "web_app", label: "Web App" }],
    },
  };
}

const validSourceContent = [
  "version: 1",
  "title: Architecture",
  "nodes:",
  "  - id: web_app",
  "    label: Web App",
  "",
].join("\n");

export async function writeValidDiagramSource(sourcePath) {
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, validSourceContent, "utf8");
}

export async function writeFreshSvgArtifact(artifactPath, provenanceSourcePath) {
  await writeFile(
    artifactPath,
    addSvgProvenanceMetadata(
      '<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>',
      createSvgRendererProvenance({
        sourcePath: provenanceSourcePath,
        sourceContent: validSourceContent,
      }),
    ),
    "utf8",
  );
}

export async function writeSvgArtifactWithContent(artifactPath, svgContent) {
  await writeFile(artifactPath, svgContent, "utf8");
}

export function sourcePath(tempRoot, fileName) {
  return path.join(tempRoot, "docs", fileName);
}

export function requiredSource(sourcesByPath, sourcePath) {
  const source = sourcesByPath.get(sourcePath);

  assert.notEqual(source, undefined, `Expected result for ${sourcePath}`);

  return source;
}
