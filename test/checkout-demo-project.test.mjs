import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  getDiagramPilotVersion,
  loadValidatedDiagramSpec,
} from "../packages/core/dist/index.js";
import {
  assertCliSuccess,
  assertFreshCheckOutput,
  findFilesMatching,
  runBuiltCli,
  sha256Hex,
} from "./cli-smoke-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkoutDemoRoot = path.join(repoRoot, "demo-projects", "checkout");
const checkoutArchitectureSource = path.join("docs", "architecture.dp.yaml");
const checkoutArchitectureSvg = path.join(
  checkoutDemoRoot,
  "docs",
  "architecture.svg",
);

async function findDiagramPilotSources(rootPath) {
  return findFilesMatching(rootPath, rootPath, /\.dp\.(yaml|json)$/u);
}

async function findSourceSnippets(rootPath) {
  return findFilesMatching(rootPath, path.join(rootPath, "src"), /\.(ts|tsx)$/u);
}

function metadataSourceOf(value) {
  return value.metadata?.source;
}

test("checkout demo project has one canonical DiagramPilot source that validates through the CLI", async () => {
  assert.deepEqual(await findDiagramPilotSources(checkoutDemoRoot), [
    path.join("docs", "architecture.dp.yaml"),
  ]);

  const result = await runBuiltCli(
    ["validate", checkoutArchitectureSource],
    checkoutDemoRoot,
  );

  assertCliSuccess(result, { stdout: `Valid ${checkoutArchitectureSource}\n` });
});

test("checkout demo project supports check as a read-only repository review command", async () => {
  const svgBefore = await readFile(checkoutArchitectureSvg, "utf8");

  const result = await runBuiltCli(["check"], checkoutDemoRoot);

  assertFreshCheckOutput(result);

  const svgAfter = await readFile(checkoutArchitectureSvg, "utf8");

  assert.equal(svgAfter, svgBefore);
});

test("checkout demo project SVG is rendered by the real CLI with deterministic provenance", async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-checkout-demo-"),
  );

  try {
    const renderedSvgPath = path.join(tempRoot, "architecture.svg");
    const result = await runBuiltCli(
      ["render", checkoutArchitectureSource, "--out", renderedSvgPath],
      checkoutDemoRoot,
    );

    assertCliSuccess(result);

    const renderedSvg = await readFile(renderedSvgPath, "utf8");
    const committedSvg = await readFile(checkoutArchitectureSvg, "utf8");
    const sourceText = await readFile(
      path.join(checkoutDemoRoot, checkoutArchitectureSource),
      "utf8",
    );
    const provenanceMatch = /<metadata id="diagrampilot-provenance">(?<json>.*?)<\/metadata>/s.exec(
      renderedSvg,
    );

    assert.equal(renderedSvg, committedSvg);
    assert.notEqual(provenanceMatch, null);
    assert.deepEqual(JSON.parse(provenanceMatch.groups.json), {
      sourcePath: checkoutArchitectureSource,
      sourceSha256: sha256Hex(sourceText),
      diagramPilotVersion: getDiagramPilotVersion(),
      renderer: {
        name: "@terrastruct/d2",
        version: "0.1.33",
      },
    });
    assert.doesNotMatch(
      provenanceMatch.groups.json,
      /timestamp|renderedAt|createdAt|date/iu,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("checkout demo source demonstrates groups, icons, edge labels, and local source references", async () => {
  assert.deepEqual(await findSourceSnippets(checkoutDemoRoot), [
    path.join("src", "api", "checkout-routes.ts"),
    path.join("src", "data", "orders-repository.ts"),
    path.join("src", "events", "order-events.ts"),
    path.join("src", "services", "checkout-service.ts"),
    path.join("src", "services", "inventory-service.ts"),
    path.join("src", "services", "payment-provider.ts"),
    path.join("src", "web", "checkout-page.tsx"),
    path.join("src", "workers", "fulfillment-worker.ts"),
  ]);

  const loadResult = loadValidatedDiagramSpec(
    path.join(checkoutDemoRoot, checkoutArchitectureSource),
  );

  assert.equal(loadResult.ok, true);

  const { spec } = loadResult;
  const objects = [
    ...spec.nodes,
    ...(spec.groups ?? []),
    ...(spec.edges ?? []),
  ];
  const ids = objects.map((object) => object.id);
  const sourceReferences = [
    metadataSourceOf(spec),
    ...objects.map(metadataSourceOf),
  ];

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(spec.nodes.length, 8);
  assert.equal(spec.groups?.length, 4);
  assert.equal(spec.edges?.length, 8);
  assert.equal(spec.nodes.every((node) => node.icon?.startsWith("lucide:")), true);
  assert.equal(
    spec.groups?.every((group) => group.icon?.startsWith("lucide:")),
    true,
  );
  assert.equal(
    spec.edges?.every(
      (edge) => typeof edge.label === "string" && edge.label.length > 0,
    ),
    true,
  );
  assert.deepEqual(
    spec.groups?.find((group) => group.id === "checkout_system")?.contains,
    ["customer_experience", "checkout_runtime", "fulfillment_pipeline"],
  );

  assert.equal(sourceReferences.every((reference) => typeof reference === "string"), true);
  for (const sourceReference of sourceReferences) {
    await access(path.join(checkoutDemoRoot, sourceReference));
  }
});
