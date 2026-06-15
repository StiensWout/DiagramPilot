import assert from "node:assert/strict";
import test from "node:test";

import { importD2Diagram, importDotDiagram } from "../packages/core/dist/index.js";

function assertDroppedDiagnostic(result, construct) {
  assert.equal(
    result.fidelity.diagnostics.some(
      (diagnostic) =>
        diagnostic.kind === "dropped" && diagnostic.construct === construct,
    ),
    true,
  );
}

test("imports D2 diagrams with stable IDs, labels, containment, directed edges, and fidelity diagnostics", () => {
  const result = importD2Diagram(
    [
      "cloud: Cloud Services {",
      "  api: Orders API",
      "  db: Orders DB",
      "}",
      "cloud.api -> cloud.db: writes",
      "cloud.api.style.fill: '#eef'",
      "",
    ].join("\n"),
  );

  assert.equal(result.ok, true);
  assert.equal(result.spec.title, "Imported D2 Diagram");
  assert.equal(result.spec.direction, "right");
  assert.deepEqual(result.spec.nodes, [
    { id: "cloud_api", label: "Orders API" },
    { id: "cloud_db", label: "Orders DB" },
  ]);
  assert.deepEqual(result.spec.groups, [
    {
      id: "cloud",
      label: "Cloud Services",
      contains: ["cloud_api", "cloud_db"],
    },
  ]);
  assert.deepEqual(result.spec.edges, [
    {
      id: "cloud_api_to_cloud_db",
      from: "cloud_api",
      to: "cloud_db",
      label: "writes",
    },
  ]);
  assert.equal(result.fidelity.summary.dropped, 1);
  assertDroppedDiagnostic(result, "D2 styling or layout");
});

test("imports DOT digraphs with rank direction, labels, clusters, directed edges, and fidelity diagnostics", () => {
  const result = importDotDiagram(
    [
      "digraph G {",
      "  rankdir=LR;",
      '  subgraph cluster_backend {',
      '    label="Backend";',
      '    api [label="Orders API"];',
      '    db [label="Orders DB"];',
      "  }",
      '  api -> db [label="writes"];',
      '  api [shape=box];',
      "}",
      "",
    ].join("\n"),
  );

  assert.equal(result.ok, true);
  assert.equal(result.spec.title, "Imported DOT Diagram");
  assert.equal(result.spec.direction, "right");
  assert.deepEqual(result.spec.nodes, [
    { id: "api", label: "Orders API" },
    { id: "db", label: "Orders DB" },
  ]);
  assert.deepEqual(result.spec.groups, [
    {
      id: "backend",
      label: "Backend",
      contains: ["api", "db"],
    },
  ]);
  assert.deepEqual(result.spec.edges, [
    {
      id: "api_to_db",
      from: "api",
      to: "db",
      label: "writes",
    },
  ]);
  assert.equal(result.fidelity.summary.dropped, 1);
  assertDroppedDiagnostic(result, "DOT styling or layout");
});

test("reports unsupported D2 and DOT constructs instead of modeling them as nodes", () => {
  const d2 = importD2Diagram(
    [
      "api: API",
      "vars: {",
      "  accent: blue",
      "}",
      "",
    ].join("\n"),
  );

  assert.equal(d2.ok, true);
  assert.deepEqual(d2.spec.nodes, [{ id: "api", label: "API" }]);
  assert.equal(d2.spec.groups, undefined);
  assert.equal(
    d2.fidelity.diagnostics.some(
      (diagnostic) =>
        diagnostic.kind === "dropped" &&
        diagnostic.construct === "D2 variable or class",
    ),
    true,
  );

  const dot = importDotDiagram(
    [
      "digraph G {",
      "  a;",
      "  b;",
      "  c;",
      "  { a b } -> c;",
      "}",
      "",
    ].join("\n"),
  );

  assert.equal(dot.ok, true);
  assert.deepEqual(dot.spec.nodes, [
    { id: "a", label: "a" },
    { id: "b", label: "b" },
    { id: "c", label: "c" },
  ]);
  assert.equal(dot.spec.edges, undefined);
  assert.equal(
    dot.fidelity.diagnostics.some(
      (diagnostic) =>
        diagnostic.kind === "dropped" &&
        diagnostic.construct === "DOT syntax",
    ),
    true,
  );
});

test("resolves D2 and DOT stable ID collisions deterministically", () => {
  const d2 = importD2Diagram(
    [
      "API: Upper API",
      "api: Lower API",
      "API -> api: calls",
      "",
    ].join("\n"),
  );

  assert.equal(d2.ok, true);
  assert.deepEqual(d2.spec.nodes, [
    { id: "api", label: "Upper API" },
    { id: "api_2", label: "Lower API" },
  ]);
  assert.deepEqual(d2.spec.edges, [
    {
      id: "api_to_api_2",
      from: "api",
      to: "api_2",
      label: "calls",
    },
  ]);

  const dot = importDotDiagram(
    [
      "digraph G {",
      '  API [label="Upper API"];',
      '  api [label="Lower API"];',
      '  API -> api [label="calls"];',
      "}",
      "",
    ].join("\n"),
  );

  assert.equal(dot.ok, true);
  assert.deepEqual(dot.spec.nodes, [
    { id: "api", label: "Upper API" },
    { id: "api_2", label: "Lower API" },
  ]);
  assert.deepEqual(dot.spec.edges, [
    {
      id: "api_to_api_2",
      from: "api",
      to: "api_2",
      label: "calls",
    },
  ]);
});
