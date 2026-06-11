import { spawnSync } from "node:child_process";

export function runNpmPackDryRun(rootPath, packageName) {
  const result = spawnSync(
    "npm",
    ["pack", "--dry-run", "--json", "--workspace", packageName],
    {
      cwd: rootPath,
      encoding: "utf8",
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      maxBuffer: 1024 * 1024 * 4,
    },
  );

  if (result.status !== 0) {
    return npmPackFailureResult(packageName, result);
  }

  return parseNpmPackDryRunResult(packageName, result.stdout);
}

function npmPackFailureResult(packageName, result) {
  return {
    issues: [
      `npm pack --dry-run failed for ${packageName}: ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    ],
  };
}

function parseNpmPackDryRunResult(packageName, stdout) {
  try {
    return validateNpmPackDryRunJson(packageName, JSON.parse(stdout));
  } catch (error) {
    return {
      issues: [`npm pack --dry-run returned invalid JSON for ${packageName}: ${error.message}.`],
    };
  }
}

function validateNpmPackDryRunJson(packageName, packResult) {
  if (!Array.isArray(packResult) || packResult.length !== 1) {
    return {
      issues: [`npm pack --dry-run returned unexpected JSON for ${packageName}.`],
    };
  }

  return { packResult: packResult[0], issues: [] };
}
