#!/usr/bin/env node
import { chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entryPoint = path.join(packageRoot, "dist", "index.js");

chmodSync(entryPoint, 0o755);
