import assert from "node:assert/strict";
import test from "node:test";

import { importMermaidDiagram } from "../packages/core/dist/index.js";

test("imports Mermaid flowcharts with stable IDs, labels, directed edges, and fidelity diagnostics", () => {
  const result = importMermaidDiagram(
    [
      "flowchart TD",
      '  API["Orders API"]',
      '  api["Lowercase API"]',
      "  API -->|calls| api",
      "  classDef muted fill:#eee",
      "",
    ].join("\n"),
  );

  assert.equal(result.ok, true);
  assert.equal(result.spec.direction, "down");
  assert.deepEqual(result.spec.nodes, [
    { id: "api", label: "Orders API" },
    { id: "api_2", label: "Lowercase API" },
  ]);
  assert.deepEqual(result.spec.edges, [
    {
      id: "api_to_api_2",
      from: "api",
      to: "api_2",
      label: "calls",
    },
  ]);
  assert.equal(result.fidelity.summary.approximated, 0);
  assert.equal(result.fidelity.summary.dropped, 1);
  assert.equal(
    result.fidelity.diagnostics.some(
      (diagnostic) =>
        diagnostic.kind === "dropped" &&
        diagnostic.construct === "Mermaid styling or interaction",
    ),
    true,
  );
});
