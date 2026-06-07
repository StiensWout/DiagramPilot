import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const publicAgentDocs = [
  "quickstart.md",
  "installation.md",
  "spec.md",
  "error-repair.md",
  "examples.md",
  "prompting.md",
];

export const internalDocs = [
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  "docs/agents/domain.md",
  "docs/development/roadmap.md",
  "docs/development/architecture.md",
  "docs/development/release-version-workflow.md",
  "docs/development/public-website-deployment.md",
  "docs/adr/0006-public-docs-live-under-docs-public.md",
];

export async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}
