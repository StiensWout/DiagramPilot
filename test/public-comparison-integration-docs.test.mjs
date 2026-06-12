import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import { repoRoot } from "./docs-public-boundary-helpers.mjs";

function readRepoFile(...segments) {
  return readFile(path.join(repoRoot, ...segments), "utf8");
}

function readPublicAgentDoc(fileName) {
  return readRepoFile("docs-public", "agents", fileName);
}

test("public docs compare adjacent tools and show integration workflows", async () => {
  const [comparisons, integrations, publicDocsIndex, readme, llmsText] =
    await Promise.all([
      readPublicAgentDoc("comparisons.md"),
      readPublicAgentDoc("integrations.md"),
      readRepoFile("docs-public", "index.md"),
      readRepoFile("README.md"),
      readRepoFile("llms.txt"),
    ]);

  assertMatchesAll(comparisons, [
    /# Comparisons And Adjacent Tools/,
    /repo-native diagram compiler/i,
    /not a generic diagramming replacement/i,
    /## Mermaid/,
    /Mermaid is best at/i,
    /DiagramPilot complements Mermaid/i,
    /Choose Mermaid directly/i,
    /## D2/,
    /D2 is best at/i,
    /DiagramPilot complements D2/i,
    /Choose D2 directly/i,
    /## Graphviz\/DOT/,
    /Graphviz\/DOT is best at/i,
    /DiagramPilot complements Graphviz\/DOT/i,
    /Choose Graphviz\/DOT directly/i,
    /## dependency-cruiser/,
    /dependency-cruiser is best at/i,
    /DiagramPilot complements dependency-cruiser/i,
    /Choose dependency-cruiser directly/i,
    /## React Flow/,
    /React Flow is best at/i,
    /DiagramPilot complements React Flow/i,
    /Choose React Flow directly/i,
  ]);

  assertMatchesAll(integrations, [
    /# Integrations And Agent Recipes/,
    /## GitHub Actions/,
    /diagrampilot validate docs\/architecture\.dp\.yaml/,
    /diagrampilot render docs\/architecture\.dp\.yaml --out docs\/architecture\.svg/,
    /diagrampilot check/,
    /## Coding-Agent Workflow/,
    /diagrampilot inspect docs --json/,
    /diagrampilot check docs --json/,
  ]);

  assertMatchesAll(publicDocsIndex, [
    /\[Comparisons and adjacent tools]\(agents\/comparisons\.md\)/,
    /\[Integrations and agent recipes]\(agents\/integrations\.md\)/,
  ]);

  assertMatchesAll(readme, [
    /\[Comparisons and adjacent tools]\(docs-public\/agents\/comparisons\.md\)/,
    /\[Integrations and agent recipes]\(docs-public\/agents\/integrations\.md\)/,
  ]);

  assertMatchesAll(llmsText, [
    /https:\/\/diagrampilot\.com\/docs\/agents\/comparisons\.md/,
    /https:\/\/diagrampilot\.com\/docs\/agents\/integrations\.md/,
  ]);
});
