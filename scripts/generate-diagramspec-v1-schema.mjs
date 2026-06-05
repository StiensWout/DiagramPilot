import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDiagramSpecV1JsonSchema } from "../packages/core/dist/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(repoRoot, "schema", "diagramspec-v1.schema.json");

await mkdir(path.dirname(schemaPath), { recursive: true });
await writeFile(
  schemaPath,
  `${JSON.stringify(createDiagramSpecV1JsonSchema(), null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${path.relative(repoRoot, schemaPath)}`);
