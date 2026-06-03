import type { DiagramSpec } from "@diagrampilot/core";
import { exportDiagramSpecToD2 } from "@diagrampilot/export-d2";
import { D2 } from "@terrastruct/d2";

export const RENDER_SVG_PACKAGE_NAME = "@diagrampilot/render-svg";

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

export async function renderDiagramSpecToSvg(
  spec: DiagramSpec,
): Promise<string> {
  const d2 = new D2();

  try {
    const d2Text = exportDiagramSpecToD2(spec);
    const result = await d2.compile(d2Text);

    return await d2.render(result.diagram, result.renderOptions);
  } finally {
    await terminateD2Worker(d2);
  }
}
