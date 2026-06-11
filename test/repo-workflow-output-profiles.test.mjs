import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  checkDiagramPilotRepoWorkflowWithDependencies,
} from "../packages/core/dist/index.js";
import {
  SVG_RENDERER_NAME,
  SVG_RENDERER_VERSION,
  validSourceContext,
  withTempRepo,
} from "./repo-workflow-configured-artifacts-helpers.mjs";

function profileCheckConfig(tempRoot) {
  return {
    path: path.join(tempRoot, "diagrampilot.config.yaml"),
    directory: tempRoot,
    version: 1,
    sources: { ignore: [] },
    artifacts: [
      {
        source: "docs/architecture.dp.yaml",
        outputs: [
          {
            format: "mermaid",
            path: "generated/{stem}.mmd",
            profile: "compact",
          },
        ],
      },
    ],
  };
}

test("checkDiagramPilotRepoWorkflowWithDependencies passes configured output profiles to text artifact checks", async () => {
  await withTempRepo(async (tempRoot) => {
    const source = validSourceContext(
      path.join(tempRoot, "docs", "architecture.dp.yaml"),
    );
    const cleanMermaid = "flowchart LR\n  web_app[\"Web App\"]\n";
    const compactMermaid = "flowchart LR\nweb_app[\"Web App\"]\n";
    const receivedProfiles = [];

    await mkdir(path.join(tempRoot, "generated"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "generated", "architecture.mmd"),
      compactMermaid,
      "utf8",
    );

    const result = await checkDiagramPilotRepoWorkflowWithDependencies(
      {
        renderer: {
          name: SVG_RENDERER_NAME,
          version: SVG_RENDERER_VERSION,
        },
      },
      {
        discoverRepoWorkflowConfig: async () => ({
          ok: true,
          config: profileCheckConfig(tempRoot),
        }),
        discoverDiagramPilotSourceFiles: async () => ({
          ok: true,
          scope: { kind: "directory", path: tempRoot },
          sources: [
            {
              absolutePath: source.path,
              relativePath: "docs/architecture.dp.yaml",
            },
          ],
        }),
        loadValidatedDiagramSpec: () => ({
          ok: true,
          source,
          spec: source.value,
        }),
        checkExpectedSvgArtifactFreshnessForValidatedSource: async () => {
          throw new Error("configured outputs replace default SVG freshness");
        },
        exportConfiguredTextArtifact: ({ profile }) => {
          receivedProfiles.push(profile);
          return profile === "compact" ? compactMermaid : cleanMermaid;
        },
        createRepairableDiagnosticReport: () => {
          throw new Error("valid sources should not need diagnostics");
        },
        getCurrentWorkingDirectory: () => tempRoot,
      },
    );

    assert.equal(result.ok, true);
    assert.deepEqual(receivedProfiles, ["compact"]);
    assert.deepEqual(result.sources[0].artifacts, [
      {
        format: "mermaid",
        status: "fresh",
        path: "generated/architecture.mmd",
        freshness: "content",
      },
    ]);
  });
});
