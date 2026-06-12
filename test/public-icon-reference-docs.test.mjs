import assert from "node:assert/strict";
import test from "node:test";

import { assertMatchesAll } from "./assertion-helpers.mjs";
import {
  readPublicAgentDoc,
  readRepoText,
} from "./docs-public-boundary-helpers.mjs";

test("public docs include local packaged Lucide icon discovery", async () => {
  const iconReference = await readPublicAgentDoc("icons.md");
  const specGuide = await readPublicAgentDoc("spec.md");
  const agentWorkflow = await readPublicAgentDoc("agent-workflow.md");
  const publicDocsIndex = await readRepoText("docs-public/index.md");
  const readme = await readRepoText("README.md");
  const llmsText = await readRepoText("llms.txt");

  assertMatchesAll(iconReference, [
    /# Icon Reference/,
    /diagrampilot icons list/,
    /diagrampilot icons search database/,
    /supported\s+packaged icon namespace is `lucide:\*`/i,
    /lucide:database/,
    /lucide:server/,
    /lucide:globe/,
    /lucide:shopping-cart/,
    /lucide:git-pull-request/,
  ]);

  assert.match(specGuide, /\[Icon reference]\(icons\.md\)/);
  assert.match(agentWorkflow, /\[Icon reference]\(icons\.md\)/);
  assert.match(publicDocsIndex, /\[Icon reference]\(agents\/icons\.md\)/);
  assert.match(readme, /\[Icon reference]\(docs-public\/agents\/icons\.md\)/);
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/icons\.md/,
  );
});
