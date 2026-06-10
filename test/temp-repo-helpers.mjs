import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempRepoPrefix(prefix, run) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), prefix));

  try {
    return await run(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
