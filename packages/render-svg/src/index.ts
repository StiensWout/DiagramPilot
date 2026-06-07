import {
  createSvgArtifactProvenance,
  type DiagramSpec,
  type SvgArtifactProvenance,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { Resvg } from "@resvg/resvg-js";
import { D2 } from "@terrastruct/d2";

export const RENDER_SVG_PACKAGE_NAME = "@diagrampilot/render-svg";
export const SVG_RENDERER_NAME = "@terrastruct/d2";
export const SVG_RENDERER_VERSION = "0.1.33";

export type SvgRendererProvenance = SvgArtifactProvenance;

export interface CreateSvgRendererProvenanceOptions {
  sourcePath: string;
  sourceContent: string | Uint8Array;
}

export interface RenderDiagramSpecToSvgOptions {
  provenance?: SvgRendererProvenance;
}

interface D2WorkerOwner {
  worker?: {
    terminate(): Promise<number> | number;
  };
}

async function terminateD2Worker(d2: D2): Promise<void> {
  const worker = (d2 as D2WorkerOwner).worker;

  if (worker === undefined) {
    return;
  }

  await worker.terminate();
}

export function createSvgRendererProvenance(
  options: CreateSvgRendererProvenanceOptions,
): SvgRendererProvenance {
  return createSvgArtifactProvenance({
    sourcePath: options.sourcePath,
    sourceContent: options.sourceContent,
    renderer: {
      name: SVG_RENDERER_NAME,
      version: SVG_RENDERER_VERSION,
    },
  });
}

export function addSvgProvenanceMetadata(
  svg: string,
  provenance: SvgRendererProvenance,
): string {
  const openingSvgTag = /<svg\b[^>]*>/i.exec(svg);

  if (openingSvgTag === null) {
    return svg;
  }

  const insertionIndex = openingSvgTag.index + openingSvgTag[0].length;
  const metadata = `<metadata id="diagrampilot-provenance">${JSON.stringify(
    provenance,
  )}</metadata>`;

  return `${svg.slice(0, insertionIndex)}${metadata}${svg.slice(
    insertionIndex,
  )}`;
}

export async function renderDiagramSpecToSvg(
  spec: DiagramSpec,
  options: RenderDiagramSpecToSvgOptions = {},
): Promise<string> {
  const d2 = new D2();

  try {
    const d2Text = exportDiagramSpecToD2(spec);
    const result = await d2.compile(d2Text);
    const renderedSvg = await d2.render(result.diagram, result.renderOptions);

    if (options.provenance === undefined) {
      return renderedSvg;
    }

    return addSvgProvenanceMetadata(renderedSvg, options.provenance);
  } finally {
    await terminateD2Worker(d2);
  }
}

export function rasterizeSvgToPng(svg: string | Buffer): Uint8Array {
  return new Resvg(svg).render().asPng();
}
