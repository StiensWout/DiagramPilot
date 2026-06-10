import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const brokenYamlSourceLines = [
  "version: 1",
  "title: Broken Source",
  "nodes: [",
  "",
];

export async function writeDiagramSource(tempRoot, fileName, lines) {
  const sourcePath = path.join(tempRoot, "docs", fileName);

  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, lines.join("\n"), "utf8");

  return sourcePath;
}

export function assertFailedLoad(result, kind) {
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, kind);
}
