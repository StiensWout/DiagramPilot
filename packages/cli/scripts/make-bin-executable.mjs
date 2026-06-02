import { chmodSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.resolve(scriptDir, "../dist/index.js");

if (!existsSync(binPath)) {
  throw new Error(`Cannot mark missing CLI build executable: ${binPath}`);
}

chmodSync(binPath, 0o755);
