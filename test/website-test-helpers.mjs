import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runSuccessfulProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let websiteBuildPromise;

export async function websiteBuild() {
  websiteBuildPromise ??= runSuccessfulProcess(
    "npm",
    ["--workspace", "website", "run", "build"],
    {
      cwd: repoRoot,
      env: sanitizedTestEnv({ CI: "true" }),
      label: "Website build",
    },
  ).then(() => undefined);

  return websiteBuildPromise;
}

export async function publicDocsSync() {
  await runSuccessfulProcess("node", ["scripts/sync-public-docs.mjs"], {
    cwd: path.join(repoRoot, "website"),
    env: sanitizedTestEnv({ CI: "true" }),
    label: "Public docs sync",
  });
}

export async function gitLsFiles(paths, { split = false } = {}) {
  const result = await runSuccessfulProcess("git", ["ls-files", "--", ...paths], {
    cwd: repoRoot,
    label: "git ls-files",
  });

  if (!split) return result.stdout;

  return result.stdout.trim().split("\n").filter(Boolean);
}

export async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}
