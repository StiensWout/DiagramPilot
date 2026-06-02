import assert from "node:assert/strict";
import test from "node:test";

import {
  getPackagedLucideIconMetadata,
  isPackagedLucideIconName,
  listPackagedLucideIconNames,
} from "../packages/icons/dist/index.js";

test("@diagrampilot/icons exposes packaged Lucide metadata locally", () => {
  const iconNames = listPackagedLucideIconNames();
  const databaseMetadata = getPackagedLucideIconMetadata("database");

  assert.equal(isPackagedLucideIconName("database"), true);
  assert.equal(isPackagedLucideIconName("not-a-real-icon"), false);
  assert.ok(iconNames.includes("database"));
  assert.ok(iconNames.includes("database-backup"));
  assert.equal(databaseMetadata?.namespace, "lucide");
  assert.equal(databaseMetadata?.name, "database");
  assert.ok(Array.isArray(databaseMetadata.iconNode));
  assert.equal(getPackagedLucideIconMetadata("not-a-real-icon"), undefined);
});
