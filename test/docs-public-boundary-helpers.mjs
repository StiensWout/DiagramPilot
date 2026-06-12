import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const publicAgentDocs = [
  "agent-workflow.md",
  "quickstart.md",
  "installation.md",
  "mcp.md",
  "spec.md",
  "icons.md",
  "error-repair.md",
  "examples.md",
  "prompting.md",
  "comparisons.md",
  "integrations.md",
];

export const removedInternalPlanningPaths = [
  ".scratch",
  "CONTEXT.md",
  "docs/adr",
  "docs/agents",
  "docs/development",
  "scripts/check-issue-release-version.mjs",
  "scripts/release-issue-utils.mjs",
  "scripts/sync-issue-release-version.mjs",
];

export async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

export function readPublicAgentDoc(fileName) {
  return readFile(path.join(repoRoot, "docs-public", "agents", fileName), "utf8");
}

export function readRepoText(repoPath) {
  return readFile(path.join(repoRoot, repoPath), "utf8");
}
