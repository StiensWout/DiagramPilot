#!/usr/bin/env node
import {
  MAINTAINABILITY_FILE_SIZE_GATE,
  auditMaintainabilityFileSizes,
} from "../packages/core/dist/index.js";

function listBlock(label, values) {
  return [`${label}:`, ...values.map((value) => `  - ${value}`)].join("\n");
}

const result = await auditMaintainabilityFileSizes(process.cwd());

console.log("Maintainability file-size audit");
console.log(`Gate: ${MAINTAINABILITY_FILE_SIZE_GATE.maxLineCount} LOC`);
console.log(
  `Pressure line: ${MAINTAINABILITY_FILE_SIZE_GATE.pressureLineCount} LOC`,
);
console.log(
  listBlock("Included paths", MAINTAINABILITY_FILE_SIZE_GATE.includedPathGlobs),
);
console.log(
  listBlock("Excluded paths", MAINTAINABILITY_FILE_SIZE_GATE.excludedPathGlobs),
);
console.log(`Checked files: ${result.checkedFiles.length}`);

if (result.ok) {
  console.log("Violations: none");
  process.exit(0);
}

console.log("Violations:");

for (const violation of result.violations) {
  console.log(
    `  - ${violation.path}: ${violation.lineCount} LOC (limit ${violation.maxLineCount})`,
  );
}

process.exit(1);
