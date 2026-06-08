export function validLoadResult(sourcePath = "docs/architecture.dp.yaml") {
  return {
    ok: true,
    source: {
      format: "yaml",
      path: sourcePath,
      content: "version: 1\n",
      value: {
        version: 1,
        title: "Checkout Architecture",
        nodes: [{ id: "web_app", label: "Web App" }],
      },
    },
    spec: {
      version: 1,
      title: "Checkout Architecture",
      nodes: [{ id: "web_app", label: "Web App" }],
    },
  };
}

export function readFailure(path = "docs/missing.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "read",
      path,
      message: "ENOENT: no such file or directory",
    },
  };
}

export function parseFailure(path = "docs/broken.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "parse",
      format: "yaml",
      path,
      message: "Unexpected end of file",
      line: 3,
      column: 1,
    },
  };
}

export function validationFailure(path = "docs/invalid.dp.yaml") {
  return {
    ok: false,
    failure: {
      kind: "validation",
      source: {
        format: "yaml",
        path,
        value: {
          version: 1,
          nodes: [{ id: "web_app", label: "Web App" }],
        },
      },
      errors: [
        {
          path: "title",
          message: "Missing required top-level field: title.",
          expected: "Required top-level fields: version, title, nodes.",
          suggestion: "Add a title field.",
        },
      ],
    },
  };
}

export function createPlanningDependencies(overrides = {}) {
  return {
    loadValidatedDiagramSpec: () => validLoadResult(),
    checkDiagramPilotRepoWorkflow: async () => ({
      ok: true,
      scope: { kind: "directory", path: "/repo" },
      summary: {
        checkedSourceCount: 0,
        freshSourceCount: 0,
        issueCount: 0,
      },
      sources: [],
    }),
    generateDiagramPilotRepoWorkflow: async (options) => {
      const loadResult = validLoadResult();
      const content = await options.renderSvgArtifact({
        source: loadResult.source,
        provenanceSourcePath: loadResult.source.path,
        spec: loadResult.spec,
        diagramPilotVersion: "0.1.0",
        renderer: { name: "@terrastruct/d2", version: "0.1.33" },
      });

      return {
        ok: true,
        scope: {
          kind: "file",
          path: loadResult.source.path,
        },
        summary: {
          checkedSourceCount: 1,
          writtenArtifactCount: 1,
          skippedArtifactCount: 0,
          failureCount: 0,
        },
        written: [
          {
            sourcePath: loadResult.source.path,
            format: "svg",
            path: "docs/architecture.svg",
            absolutePath: "docs/architecture.svg",
            content,
          },
        ],
        skipped: [],
        failures: [],
      };
    },
    exportDiagramSpecToMermaid: () => "flowchart LR\n",
    exportDiagramSpecToD2: () => "direction: right\n",
    exportDiagramSpecToDot: () => "digraph checkout_architecture {\n}\n",
    readSourceContent: () => "version: 1\n",
    renderDiagramSpecToSvg: async () => "<svg></svg>",
    rasterizeSvgToPng: () => Buffer.from([]),
    createSvgRendererProvenance: () => ({
      sourcePath: "docs/architecture.dp.yaml",
      sourceSha256: "hash",
      diagramPilotVersion: "0.1.0",
      renderer: { name: "@terrastruct/d2", version: "0.1.33" },
    }),
    getDiagramPilotVersion: () => "0.1.0",
    ...overrides,
  };
}
