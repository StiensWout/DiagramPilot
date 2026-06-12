import assert from "node:assert/strict";
import test from "node:test";

import { planDiagramPilotSourceFix } from "../packages/core/dist/index.js";
import { writeDiagramSource } from "./diagramspec-loading-helpers.mjs";
import { withTempRepoPrefix } from "./temp-repo-helpers.mjs";

async function withTempRepo(run) {
  return withTempRepoPrefix("diagrampilot-source-fixing-", run);
}

test("plans canonical formatting for valid DiagramPilot Source Files", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "architecture.dp.yaml", [
      "title: Checkout Architecture",
      "version: 1",
      "nodes: [{ id: web_app, label: Web App }]",
      "",
    ]);

    const result = planDiagramPilotSourceFix(sourcePath);

    assert.deepEqual(result, {
      ok: true,
      sourcePath,
      changed: true,
      repairs: [
        {
          kind: "format-source",
          path: "$",
          message: "Format source as canonical DiagramPilot YAML.",
        },
      ],
      content: [
        "version: 1",
        "title: Checkout Architecture",
        "nodes:",
        "  - id: web_app",
        "    label: Web App",
        "",
      ].join("\n"),
      validation: {
        ok: true,
        errors: [],
      },
    });
  });
});

test("plans configured icon fallback as a deterministic source repair", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "unknown-icon.dp.yaml", [
      "version: 1",
      "title: Unknown Icon Architecture",
      "nodes:",
      "  - id: database",
      "    label: Database",
      "    icon: lucide:databse",
      "",
    ]);

    const result = planDiagramPilotSourceFix(sourcePath, {
      fallbackIcon: "lucide:database",
    });

    assert.deepEqual(result, {
      ok: true,
      sourcePath,
      changed: true,
      repairs: [
        {
          kind: "replace-icon",
          path: "nodes[0].icon",
          message: "Replace invalid icon with configured fallback lucide:database.",
          before: "lucide:databse",
          after: "lucide:database",
        },
      ],
      content: [
        "version: 1",
        "title: Unknown Icon Architecture",
        "nodes:",
        "  - id: database",
        "    label: Database",
        "    icon: lucide:database",
        "",
      ].join("\n"),
      validation: {
        ok: true,
        errors: [],
      },
    });
  });
});

test("refuses ambiguous duplicate stable ID repairs", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(tempRoot, "duplicate-id.dp.yaml", [
      "version: 1",
      "title: Duplicate IDs",
      "nodes:",
      "  - id: api",
      "    label: Public API",
      "  - id: api",
      "    label: Internal API",
      "",
    ]);

    const result = planDiagramPilotSourceFix(sourcePath);

    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.deepEqual(result.repairs, []);
    assert.equal(result.validation.ok, false);
    assert.equal(result.validation.errors.length, 1);
    assert.deepEqual(result.validation.errors[0], {
      path: "nodes[1].id",
      message: 'nodes[1].id duplicates nodes[0].id "api".',
      badValue: "api",
      expected: "One globally unique stable ID across nodes, edges, and groups.",
      suggestion: "Assign a unique stable ID across nodes, edges, and groups.",
    });
  });
});

test("reports remaining validation errors after deterministic repairs", async () => {
  await withTempRepo(async (tempRoot) => {
    const sourcePath = await writeDiagramSource(
      tempRoot,
      "unknown-icon-missing-title.dp.yaml",
      [
        "version: 1",
        "nodes:",
        "  - id: database",
        "    label: Database",
        "    icon: lucide:databse",
        "",
      ],
    );

    const result = planDiagramPilotSourceFix(sourcePath, {
      fallbackIcon: "lucide:database",
    });

    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.deepEqual(result.repairs, [
      {
        kind: "replace-icon",
        path: "nodes[0].icon",
        message: "Replace invalid icon with configured fallback lucide:database.",
        before: "lucide:databse",
        after: "lucide:database",
      },
    ]);
    assert.equal(result.validation.ok, false);
    assert.deepEqual(result.validation.errors, [
      {
        path: "title",
        message: "Missing required top-level field: title.",
        expected: "Required top-level fields: version, title, nodes.",
        suggestion: "Add title to the top level of the DiagramSpec.",
      },
    ]);
  });
});
