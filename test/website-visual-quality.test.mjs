import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, CI: "true", ...options.env },
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          [
            `${command} ${args.join(" ")} failed with exit code ${code}.`,
            stdout.trim(),
            stderr.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });
}

async function exists(repoPath) {
  try {
    await access(path.join(repoRoot, repoPath));
    return true;
  } catch {
    return false;
  }
}

test("website visual quality check inspects built landing and docs pages", async () => {
  await runCommand("npm", ["--workspace", "website", "run", "build"]);
  await runCommand("npm", ["--workspace", "website", "run", "check:visual"]);

  const reportPath =
    ".scratch/productization-and-maintainability/visual-quality/report.json";
  const report = JSON.parse(await readFile(path.join(repoRoot, reportPath), "utf8"));

  assert.equal(report.status, "passed");
  assert.deepEqual(
    report.checkedRoutes.map((route) => route.path),
    ["/", "/docs/agents/quickstart/"],
  );
  assert.deepEqual(
    report.viewports.map((viewport) => viewport.name),
    ["mobile", "tablet", "desktop"],
  );

  const checkNames = report.checks.map((check) => check.name);
  for (const expectedCheck of [
    "no-horizontal-scroll",
    "important-text",
    "hero-visual-nonblank",
    "focus",
    "reduced-motion",
  ]) {
    assert.ok(
      checkNames.some((name) => name.includes(expectedCheck)),
      `report should include ${expectedCheck}`,
    );
  }

  assert.equal(
    await exists(
      ".scratch/productization-and-maintainability/visual-quality/landing-mobile.png",
    ),
    true,
  );
  assert.equal(
    await exists(
      ".scratch/productization-and-maintainability/visual-quality/landing-desktop.png",
    ),
    true,
  );
  assert.ok(
    (
      await stat(
        path.join(
          repoRoot,
          ".scratch/productization-and-maintainability/visual-quality/landing-mobile.png",
        ),
      )
    ).size > 10_000,
  );
  assert.ok(
    (
      await stat(
        path.join(
          repoRoot,
          ".scratch/productization-and-maintainability/visual-quality/landing-desktop.png",
        ),
      )
    ).size > 10_000,
  );
});
