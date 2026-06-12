import assert from "node:assert/strict";
import test from "node:test";

import { exportDiagramSpecToD2 } from "../packages/export-d2/dist/index.js";

test("exports D2 direction, grouped nodes, and edges", () => {
  const d2 = exportDiagramSpecToD2({
    title: "Checkout Architecture",
    direction: "down",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "orders_service", label: "Orders Service" },
    ],
    groups: [
      {
        id: "backend",
        label: "Backend",
        contains: ["api_gateway", "orders_service"],
      },
    ],
    edges: [
      {
        id: "web_to_api",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
      },
      {
        id: "api_to_orders",
        from: "api_gateway",
        to: "orders_service",
      },
    ],
  });

  assert.equal(
    d2,
    [
      "direction: down",
      "",
      'web_app: "Web App"',
      "backend: {",
      '  label: "Backend"',
      '  api_gateway: "API Gateway"',
      '  orders_service: "Orders Service"',
      "}",
      "",
      'web_app -> backend.api_gateway: "HTTPS"',
      "backend.api_gateway -> backend.orders_service",
      "",
    ].join("\n"),
  );
});

test("exports D2 output profiles with compatible clean output and target-native presentation config", () => {
  const spec = {
    title: "Checkout Architecture",
    direction: "right",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
    ],
    edges: [
      {
        id: "web_to_api",
        from: "web_app",
        to: "api_gateway",
      },
    ],
  };
  const clean = exportDiagramSpecToD2(spec);
  const explicitClean = exportDiagramSpecToD2(spec, { profile: "clean" });
  const compact = exportDiagramSpecToD2(spec, { profile: "compact" });
  const presentation = exportDiagramSpecToD2(spec, {
    profile: "presentation",
  });

  assert.equal(explicitClean, clean);
  assert.equal(
    compact,
    [
      "direction: right",
      'web_app: "Web App"',
      'api_gateway: "API Gateway"',
      "web_app -> api_gateway",
      "",
    ].join("\n"),
  );
  assert.match(presentation, /^vars: \{/);
  assert.match(presentation, /theme-id: 4/);
  assert.match(presentation, /sketch: true/);
  assert.match(presentation, /direction: right/);
  assert.notEqual(presentation, clean);
});

test("exports known edge semantics as renderer-native D2 edge styles without rejecting custom kinds", () => {
  const d2 = exportDiagramSpecToD2({
    title: "Semantic Edges",
    nodes: [
      { id: "web_app", label: "Web App" },
      { id: "api_gateway", label: "API Gateway" },
      { id: "audit_log", label: "Audit Log" },
    ],
    edges: [
      {
        id: "web_to_api",
        from: "web_app",
        to: "api_gateway",
        label: "HTTPS",
        kind: "request",
      },
      {
        id: "api_to_audit",
        from: "api_gateway",
        to: "audit_log",
        label: "records",
        kind: "custom_audit_signal",
      },
    ],
  });

  assert.match(d2, /web_app -> api_gateway: "HTTPS" \{/);
  assert.match(d2, /style\.stroke: "#2563eb"/);
  assert.match(d2, /api_gateway -> audit_log: "records"/);
  assert.doesNotMatch(d2, /custom_audit_signal/);
});
