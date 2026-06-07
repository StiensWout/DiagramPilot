import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./docs-public-boundary-helpers.mjs";

test("internal closeout docs record completed planning state and maintainer validation", async () => {
  const roadmap = await readFile(
    path.join(repoRoot, "docs", "development", "roadmap.md"),
    "utf8",
  );
  const mvpPrd = await readFile(
    path.join(repoRoot, ".scratch", "diagrampilot-mvp", "PRD.md"),
    "utf8",
  );
  const architectureDeepeningPrd = await readFile(
    path.join(repoRoot, ".scratch", "architecture-deepening", "PRD.md"),
    "utf8",
  );
  const docsDemoPrd = await readFile(
    path.join(repoRoot, ".scratch", "docs-demo-project-rework", "PRD.md"),
    "utf8",
  );

  assert.match(mvpPrd, /^Status: completed$/m);
  assert.match(architectureDeepeningPrd, /^Status: completed$/m);
  assert.match(docsDemoPrd, /^Status: completed$/m);

  assert.match(roadmap, /Release readiness is complete/);
  assert.match(roadmap, /node --test test\/docs-public-boundary\.test\.mjs/);
  assert.match(roadmap, /node --test test\/checkout-demo-project\.test\.mjs/);
  assert.match(
    roadmap,
    /git diff --exit-code demo-projects\/checkout\/docs\/architecture\.svg/,
  );
  assert.match(roadmap, /npm test/);
});

test("completed docs demo rework issues include implementation notes and validation plans", async () => {
  const issuePaths = [
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "28-split-public-and-internal-documentation-roots.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "29-add-the-checkout-demo-project-fixture.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "30-rework-public-docs-around-the-demo-workflow.md",
    ),
    path.join(
      ".scratch",
      "docs-demo-project-rework",
      "issues",
      "31-clean-up-internal-docs-and-closeout-planning-state.md",
    ),
  ];

  for (const issuePath of issuePaths) {
    const issueText = await readFile(path.join(repoRoot, issuePath), "utf8");

    assert.match(issueText, /^Status: completed$/m, issuePath);
    assert.doesNotMatch(issueText, /- \[ \]/, issuePath);
    assert.match(issueText, /^## Implementation notes$/m, issuePath);
    assert.match(issueText, /^## Validation plan$/m, issuePath);
  }
});
