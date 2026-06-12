import assert from "node:assert/strict";
import test from "node:test";

import { exportDiagramSpecToDot } from "../packages/export-dot/dist/index.js";

test("exports nodes and directed edges as a DOT digraph", () => {
  const dot = exportDiagramSpecToDot({
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
      },
    ],
  });

  assert.equal(dot, [
    'digraph "Checkout Architecture" {',
    '  label="Checkout Architecture";',
    "  labelloc=t;",
    "  rankdir=LR;",
    '  "web_app" [label="Web App"];',
    '  "api_gateway" [label="API Gateway"];',
    '  "web_app" -> "api_gateway" [label="HTTPS"];',
    "}",
    "",
  ].join("\n"));
});

test("exports DOT output profiles with compatible clean output and Graphviz presentation attributes", () => {
  const spec = {
    version: 1,
    title: "Checkout Architecture",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
      },
    ],
  };
  const clean = exportDiagramSpecToDot(spec);
  const explicitClean = exportDiagramSpecToDot(spec, { profile: "clean" });
  const compact = exportDiagramSpecToDot(spec, { profile: "compact" });
  const presentation = exportDiagramSpecToDot(spec, {
    profile: "presentation",
  });

  assert.equal(explicitClean, clean);
  assert.equal(
    compact,
    [
      'digraph "Checkout Architecture" {',
      'label="Checkout Architecture";',
      "labelloc=t;",
      "rankdir=LR;",
      '"web_app" [label="Web App"];',
      '"api_gateway" [label="API Gateway"];',
      '"web_app" -> "api_gateway";',
      "}",
      "",
    ].join("\n"),
  );
  assert.match(presentation, /graph \[bgcolor="transparent", pad="0.35"\];/);
  assert.match(presentation, /node \[shape=box, style="rounded,filled"/);
  assert.match(presentation, /edge \[color="#475569"/);
  assert.notEqual(presentation, clean);
});

test("exports undirected DiagramSpec edges with dir none", () => {
  const dot = exportDiagramSpecToDot({
    version: 1,
    title: "Worker Sync",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "worker", label: "Worker" },
    ],
    edges: [
      {
        id: "web_app_to_worker",
        from: "web_app",
        to: "worker",
        directed: false,
      },
    ],
  });

  assert.match(dot, /digraph "Worker Sync"/);
  assert.match(dot, /"web_app" -> "worker" \[dir=none\];/);
});

test("exports DOT overview profile without edge labels", () => {
  const dot = exportDiagramSpecToDot(
    {
      version: 1,
      title: "Checkout Architecture",
      nodes: [
        { id: "web_app", label: "Web App" },
        { id: "api_gateway", label: "API Gateway" },
      ],
      edges: [
        {
          id: "web_app_to_api_gateway",
          from: "web_app",
          to: "api_gateway",
          label: "HTTPS",
        },
      ],
    },
    { profile: "overview" },
  );

  assert.match(dot, /"web_app" -> "api_gateway";/);
  assert.doesNotMatch(dot, /HTTPS/);
});

test("exports DiagramSpec groups as Graphviz clusters", () => {
  const dot = exportDiagramSpecToDot({
    version: 1,
    title: "Checkout Groups",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "worker", label: "Worker" },
    ],
    groups: [
      {
        id: "frontend",
        label: "Frontend",
        contains: ["web_app"],
      },
      {
        id: "services",
        label: "Services",
        contains: ["api_gateway", "worker"],
      },
    ],
    edges: [
      {
        id: "web_app_to_api_gateway",
        from: "web_app",
        to: "api_gateway",
      },
    ],
  });

  assert.equal(dot, [
    'digraph "Checkout Groups" {',
    '  label="Checkout Groups";',
    "  labelloc=t;",
    "  rankdir=LR;",
    '  subgraph "cluster_frontend" {',
    '    label="Frontend";',
    '    "web_app" [label="Web App"];',
    "  }",
    '  subgraph "cluster_services" {',
    '    label="Services";',
    '    "api_gateway" [label="API Gateway"];',
    '    "worker" [label="Worker"];',
    "  }",
    '  "web_app" -> "api_gateway";',
    "}",
    "",
  ].join("\n"));
});

test("escapes DOT labels, Stable IDs, and metadata-derived attributes", () => {
  const dot = exportDiagramSpecToDot({
    version: 1,
    title: 'Graph "Keyword"\nReport',
    nodes: [
      {
        id: "graph",
        label: 'API "Graph"\nPrimary',
        metadata: {
          source: 'src/"api"/index.ts',
          external_url: "https://example.com/docs?q=%22api%22",
        },
      },
      { id: "node", label: "Node" },
    ],
    edges: [
      {
        id: "graph_to_node",
        from: "graph",
        to: "node",
        label: 'Calls "Node"\nnow',
        metadata: {
          source: 'docs/"edge".md',
        },
      },
    ],
  });

  assert.match(dot, /^digraph "Graph \\"Keyword\\"\\nReport"/);
  assert.match(
    dot,
    /"graph" \[label="API \\"Graph\\"\\nPrimary", URL="https:\/\/example\.com\/docs\?q=%22api%22", tooltip="src\/\\"api\\"\/index\.ts"\];/,
  );
  assert.match(
    dot,
    /"graph" -> "node" \[label="Calls \\"Node\\"\\nnow", tooltip="docs\/\\"edge\\"\.md"\];/,
  );
});
