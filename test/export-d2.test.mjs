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
