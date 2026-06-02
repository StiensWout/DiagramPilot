import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function testEnv() {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return env;
}

function runDiagramPilot(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      npmCommand,
      ["exec", "--workspace", "diagrampilot", "--", "diagrampilot", ...args],
      {
        cwd: repoRoot,
        env: testEnv(),
      },
    );

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

test("diagrampilot executable starts and reports its version", async () => {
  const result = await runDiagramPilot(["--version"]);

  assert.equal(result.signal, null);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, "diagrampilot 0.1.0\n");
});
