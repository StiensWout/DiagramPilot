import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { assertCliSuccess } from "./cli-smoke-helpers.mjs";
import { runProcess } from "./process-helpers.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(repoRoot, "scripts", "check-package-publish-state.mjs");

async function withFakeNpm(scriptSource, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-npm-"));

  try {
    const binPath = path.join(tempRoot, "bin");
    await mkdir(binPath, { recursive: true });
    const npmPath = path.join(binPath, "npm");
    await writeFile(npmPath, scriptSource, "utf8");
    await chmod(npmPath, 0o755);

    await callback({
      env: {
        ...process.env,
        PATH: `${binPath}${path.delimiter}${process.env.PATH}`,
      },
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function runPublishStateCheck(args, env) {
  return runProcess(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    env,
  });
}

async function readWorkspaceVersion() {
  const workspaceManifest = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );
  return workspaceManifest.version;
}

function fakeNpmPublishedVersion(version, expectedTag) {
  const distTags =
    expectedTag === "prealpha"
      ? { prealpha: version, latest: "0.0.0" }
      : { latest: version };

  return `#!/usr/bin/env node
process.stdout.write(${JSON.stringify(JSON.stringify(distTags))});
`;
}

test("package publish-state check accepts available package names before reservation", async () => {
  const fakeNpm = `#!/usr/bin/env node
process.stderr.write("npm error code E404\\n");
process.exit(1);
`;

  await withFakeNpm(fakeNpm, async ({ env }) => {
    const result = await runPublishStateCheck(["--expect", "available"], env);

    assertCliSuccess(result, {
      stdout:
        "DiagramPilot npm publish-state check passed: 8 package names are available on npm.\n",
    });
  });
});

test("package publish-state check accepts prealpha package reservation", async () => {
  const workspaceVersion = await readWorkspaceVersion();

  await withFakeNpm(
    fakeNpmPublishedVersion(workspaceVersion, "prealpha"),
    async ({ env }) => {
    const result = await runPublishStateCheck(["--expect", "prealpha"], env);

    assertCliSuccess(result, {
      stdout: `DiagramPilot npm publish-state check passed: 8 packages publish ${workspaceVersion} under prealpha and latest is not moved.\n`,
    });
    },
  );
});

test("package publish-state check accepts latest public release publication", async () => {
  const workspaceVersion = await readWorkspaceVersion();

  await withFakeNpm(
    fakeNpmPublishedVersion(workspaceVersion, "latest"),
    async ({ env }) => {
    const result = await runPublishStateCheck(["--expect", "latest"], env);

    assertCliSuccess(result, {
      stdout: `DiagramPilot npm publish-state check passed: 8 packages publish ${workspaceVersion} under latest.\n`,
    });
    },
  );
});
