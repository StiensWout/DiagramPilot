import { spawn } from "node:child_process";

export const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export function sanitizedTestEnv(overrides = {}) {
  return {
    ...process.env,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
    ...overrides,
  };
}

export function runProcess(command, args, options = {}) {
  const { cwd, env = sanitizedTestEnv(), rejectOnNonZero = false, label } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env });
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
      const result = { code, signal, stdout, stderr };

      if (!rejectOnNonZero || code === 0) {
        resolve(result);
        return;
      }

      reject(
        new Error(
          [
            `${label ?? command} failed with exit code ${code}.`,
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

export async function runSuccessfulProcess(command, args, options = {}) {
  return runProcess(command, args, {
    ...options,
    rejectOnNonZero: true,
  });
}
