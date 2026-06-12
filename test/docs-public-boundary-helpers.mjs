import { access } from "node:fs/promises";
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
