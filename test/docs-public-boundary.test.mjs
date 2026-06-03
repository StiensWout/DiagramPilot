import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const publicAgentDocs = [
  "quickstart.md",
  "spec.md",
  "error-repair.md",
  "examples.md",
  "mcp.md",
  "prompting.md",
];

const internalDocs = [
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  "docs/agents/domain.md",
  "docs/development/roadmap.md",
  "docs/development/architecture.md",
  "docs/adr/0006-public-docs-live-under-docs-public.md",
];

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

test("public-facing agent usage docs live under the public docs root", async () => {
  for (const fileName of publicAgentDocs) {
    assert.equal(
      await exists(path.join("docs-public", "agents", fileName)),
      true,
      `${fileName} should be in docs-public/agents`,
    );
    assert.equal(
      await exists(path.join("docs", "agents", fileName)),
      false,
      `${fileName} should not remain in docs/agents`,
    );
  }
});

test("internal maintainer docs remain under the internal docs tree", async () => {
  for (const repoPath of internalDocs) {
    assert.equal(await exists(repoPath), true, `${repoPath} should exist`);
    assert.equal(
      await exists(path.join("docs-public", path.relative("docs", repoPath))),
      false,
      `${repoPath} should not be copied into docs-public`,
    );
  }
});

test("llms.txt links only public documentation", async () => {
  const llmsText = await readFile(path.join(repoRoot, "llms.txt"), "utf8");

  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(
    llmsText,
    /https:\/\/diagrampilot\.com\/docs\/agents\/spec\.md/,
  );
  assert.doesNotMatch(llmsText, /docs\/development\//);
  assert.doesNotMatch(llmsText, /docs\/adr\//);
  assert.doesNotMatch(llmsText, /issue-tracker\.md/);
  assert.doesNotMatch(llmsText, /triage-labels\.md/);
  assert.doesNotMatch(llmsText, /domain\.md/);
});

test("repository guidance separates public docs from internal maintainer docs", async () => {
  const agentGuide = await readFile(path.join(repoRoot, "AGENTS.md"), "utf8");

  assert.match(agentGuide, /docs-public\/agents\/quickstart\.md/);
  assert.match(agentGuide, /docs-public\/agents\/spec\.md/);
  assert.match(agentGuide, /docs-public\/agents\/error-repair\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/quickstart\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/spec\.md/);
  assert.doesNotMatch(agentGuide, /docs\/agents\/error-repair\.md/);

  assert.match(agentGuide, /docs\/agents\/issue-tracker\.md/);
  assert.match(agentGuide, /docs\/agents\/triage-labels\.md/);
  assert.match(agentGuide, /docs\/agents\/domain\.md/);
  assert.match(agentGuide, /docs\/development\/roadmap\.md/);
  assert.match(agentGuide, /docs\/adr\/0006-public-docs-live-under-docs-public\.md/);
});

test("README keeps public docs hosted and internal docs local", async () => {
  const readme = await readFile(path.join(repoRoot, "README.md"), "utf8");

  assert.match(
    readme,
    /https:\/\/diagrampilot\.com\/docs\/agents\/quickstart\.md/,
  );
  assert.match(readme, /docs\/development\/roadmap\.md/);
  assert.match(readme, /docs\/development\/architecture\.md/);
  assert.match(readme, /docs\/agents\/issue-tracker\.md/);
  assert.match(readme, /docs\/adr\/0006-public-docs-live-under-docs-public\.md/);

  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/development\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/adr\//);
  assert.doesNotMatch(readme, /https:\/\/diagrampilot\.com\/docs\/agents\/issue-tracker\.md/);
});
