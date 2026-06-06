import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(repoRoot, "scripts", "check-package-publish-state.mjs");

async function withFakeNpm(scriptSource, callback) {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagrampilot-package-publish-state-"),
  );

  try {
    const binPath = path.join(tempRoot, "bin");
    const npmPath = path.join(binPath, "npm");

    await mkdir(binPath);
    await writeFile(npmPath, scriptSource);
    await chmod(npmPath, 0o755);

    return await callback({
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        PATH: `${binPath}${path.delimiter}${process.env.PATH ?? ""}`,
      },
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function runPublishStateCheck(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env,
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
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

test("package publish-state check accepts available package names before reservation", async () => {
  const fakeNpm = `#!/usr/bin/env node
process.stderr.write("npm error code E404\\n");
process.exit(1);
`;

  await withFakeNpm(fakeNpm, async ({ env }) => {
    const result = await runPublishStateCheck(["--expect", "available"], env);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      "DiagramPilot npm publish-state check passed: 6 package names are available on npm.\n",
    );
  });
});

test("package publish-state check accepts prealpha package reservation", async () => {
  const workspaceManifest = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  const fakeNpm = `#!/usr/bin/env node
process.stdout.write(JSON.stringify({ prealpha: "${workspaceManifest.version}" }) + "\\n");
`;

  await withFakeNpm(fakeNpm, async ({ env }) => {
    const result = await runPublishStateCheck(["--expect", "prealpha"], env);

    assert.equal(result.signal, null);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(
      result.stdout,
      `DiagramPilot npm publish-state check passed: 6 packages publish ${workspaceManifest.version} under prealpha and latest is not moved.\n`,
    );
  });
});
