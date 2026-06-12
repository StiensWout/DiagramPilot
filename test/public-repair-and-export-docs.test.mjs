import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

test("public docs document repairable validation and export fidelity workflows", async () => {
  const errorRepair = await readFile(
    path.join(repoRoot, "docs-public", "agents", "error-repair.md"),
    "utf8",
  );
  const specGuide = await readFile(
    path.join(repoRoot, "docs-public", "agents", "spec.md"),
    "utf8",
  );

  assertMatchesAll(errorRepair, [
    /## Repairable Validation Errors/,
    /Repairable Validation Errors/i,
    /broken DiagramPilot Source File/i,
    /from: storefront/,
    /diagrampilot validate docs\/checkout\.dp\.yaml/,
    /edges\[0\]\.from/,
    /diagrampilot validate docs\/checkout\.dp\.yaml --json/,
    /"path": "edges\[0\]\.from"/,
    /"badValue": "storefront"/,
    /Corrected source/i,
    /from: web_app/,
    /path[\s\S]*exact DiagramSpec path/i,
    /message[\s\S]*(problem|explains)/i,
    /badValue[\s\S]*invalid value/i,
    /expected[\s\S]*(allowed|expected)/i,
    /suggestion[\s\S]*repair step/i,
    /does not mean DiagramPilot edits the source automatically/i,
    /diagrampilot fix docs\/icons\.dp\.yaml --fallback-icon lucide:database --json/,
    /diagrampilot fix docs\/icons\.dp\.yaml --fallback-icon lucide:database/,
    /JSON planning mode/i,
    /writes only the DiagramPilot Source File/i,
    /manual agent judgment/i,
    /does not\s+choose unique duplicate IDs/i,
  ]);

  assertMatchesAll(specGuide, [
    /## Export Fidelity/,
    /same\s+small\s+DiagramSpec/i,
    /title: Checkout Export Sample/,
    /### Mermaid/,
    /### D2/,
    /### DOT/,
    /flowchart LR/,
    /direction: right/,
    /digraph "Checkout Export Sample"/,
    /\| Semantic \| Mermaid \| D2 \| DOT \|/,
    /titles[\s\S]*preserved/i,
    /directions[\s\S]*(approximated|preserved)/i,
    /nodes[\s\S]*preserved/i,
    /groups[\s\S]*(approximated|preserved|dropped)/i,
    /edge labels[\s\S]*preserved/i,
    /edge direction[\s\S]*preserved/i,
    /icons[\s\S]*(approximated|dropped)/i,
    /kinds[\s\S]*(approximated|dropped)/i,
    /metadata[\s\S]*dropped/i,
    /provenance[\s\S]*dropped/i,
    /views and layout hints[\s\S]*dropped/i,
  ]);
});
