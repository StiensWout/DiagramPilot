import assert from "node:assert/strict";
import test from "node:test";

import { exportDiagramSpecToMermaid } from "../packages/export-mermaid/dist/index.js";

const checkoutSpec = {
  version: 1,
  title: "Checkout Architecture",
  direction: "right",
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
};

test("exports Mermaid output profiles with compatible clean output and compact whitespace", () => {
  const clean = exportDiagramSpecToMermaid(checkoutSpec);
  const explicitClean = exportDiagramSpecToMermaid(checkoutSpec, {
    profile: "clean",
  });
  const compact = exportDiagramSpecToMermaid(checkoutSpec, {
    profile: "compact",
  });
  const presentation = exportDiagramSpecToMermaid(checkoutSpec, {
    profile: "presentation",
  });

  assert.equal(explicitClean, clean);
  assert.equal(
    compact,
    [
      "flowchart LR",
      'web_app["Web App"]',
      'api_gateway["API Gateway"]',
      "web_app -->|HTTPS| api_gateway",
      "",
    ].join("\n"),
  );
  assert.match(presentation, /^%%\{init: /);
  assert.match(presentation, /flowchart LR/);
  assert.notEqual(presentation, clean);
});

test("exports Mermaid overview profile without edge labels", () => {
  const overview = exportDiagramSpecToMermaid(checkoutSpec, {
    profile: "overview",
  });

  assert.match(overview, /web_app --> api_gateway/);
  assert.doesNotMatch(overview, /HTTPS/);
});

test("exports Mermaid without renderer-specific layout hint syntax", () => {
  const mermaid = exportDiagramSpecToMermaid({
    ...checkoutSpec,
    layout: {
      hints: [
        {
          id: "checkout_flow",
          kind: "primary_flow",
          nodes: ["web_app", "api_gateway"],
        },
      ],
    },
  });

  assert.match(mermaid, /flowchart LR/);
  assert.doesNotMatch(mermaid, /checkout_flow|primary_flow|same_layer/);
});
