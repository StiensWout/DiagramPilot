import {
  createSvgArtifactProvenance,
  diagramSpecKnownEdgeKinds,
  getDiagramSpecKnownEdgeKind,
  type DiagramSpec,
  type DiagramSpecKnownEdgeKind,
  type RepoWorkflowOutputProfile,
  type SvgArtifactProvenance,
} from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { Resvg } from "@resvg/resvg-js";
import { D2, type CompileOptions } from "@terrastruct/d2";

export const RENDER_SVG_PACKAGE_NAME = "@diagrampilot/render-svg";
export const SVG_RENDERER_NAME = "@terrastruct/d2";
export const SVG_RENDERER_VERSION = "0.1.33";

export type SvgRendererProvenance = SvgArtifactProvenance;

export interface CreateSvgRendererProvenanceOptions {
  sourcePath: string;
  sourceContent: string | Uint8Array;
  outputProfile?: RepoWorkflowOutputProfile;
}

export interface RenderDiagramSpecToSvgOptions {
  provenance?: SvgRendererProvenance;
  profile?: RepoWorkflowOutputProfile;
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
    outputProfile: options.outputProfile,
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

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function semanticEdgeKindsForSpec(
  spec: DiagramSpec,
): readonly DiagramSpecKnownEdgeKind[] {
  const usedKnownKinds = new Set(
    (spec.edges ?? [])
      .map((edge) => getDiagramSpecKnownEdgeKind(edge.kind)?.id)
      .filter((kind): kind is string => kind !== undefined),
  );

  return diagramSpecKnownEdgeKinds.filter((kind) => usedKnownKinds.has(kind.id));
}

function edgeKindLegendRows(kinds: readonly DiagramSpecKnownEdgeKind[]): string {
  return kinds
    .map((kind, index) => {
      const y = 56 + index * 24;
      const dash =
        kind.dash === undefined ? "" : ` stroke-dasharray="${escapeSvgText(kind.dash)}"`;

      return [
        `<line x1="32" y1="${y}" x2="74" y2="${y}" stroke="${escapeSvgText(
          kind.stroke,
        )}" stroke-width="3"${dash} />`,
        `<text x="84" y="${y + 5}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="13">${escapeSvgText(
          kind.label,
        )}</text>`,
      ].join("");
    })
    .join("");
}

export function addSvgEdgeKindLegend(svg: string, spec: DiagramSpec): string {
  const semanticKinds = semanticEdgeKindsForSpec(spec);
  const closingSvgTagIndex = svg.toLowerCase().lastIndexOf("</svg>");

  if (semanticKinds.length === 0 || closingSvgTagIndex === -1) {
    return svg;
  }

  const legendHeight = 40 + semanticKinds.length * 24;
  const legend = [
    `<g id="diagrampilot-edge-kind-legend" role="img" aria-label="DiagramPilot edge kind legend">`,
    `<rect x="20" y="20" width="210" height="${legendHeight}" rx="8" fill="#ffffff" stroke="#cbd5e1" />`,
    `<text x="32" y="43" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700">Edge kinds</text>`,
    edgeKindLegendRows(semanticKinds),
    "</g>",
  ].join("");

  return `${svg.slice(0, closingSvgTagIndex)}${legend}${svg.slice(
    closingSvgTagIndex,
  )}`;
}

function d2CompileOptions(
  profile: RepoWorkflowOutputProfile | undefined,
): CompileOptions | undefined {
  if (profile === "compact") {
    return { pad: 40 };
  }

  if (profile === "presentation") {
    return {
      pad: 140,
      sketch: true,
      themeID: 4,
    };
  }

  return undefined;
}

export async function renderDiagramSpecToSvg(
  spec: DiagramSpec,
  options: RenderDiagramSpecToSvgOptions = {},
): Promise<string> {
  const d2 = new D2();

  try {
    const d2Text = exportDiagramSpecToD2(spec, {
      profile: options.profile,
    });
    const compileOptions = d2CompileOptions(options.profile);
    const result =
      compileOptions === undefined
        ? await d2.compile(d2Text)
        : await d2.compile({
            fs: { index: d2Text },
            inputPath: "index",
            options: compileOptions,
          });
    const renderedSvg = addSvgEdgeKindLegend(
      await d2.render(result.diagram, result.renderOptions),
      spec,
    );

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
