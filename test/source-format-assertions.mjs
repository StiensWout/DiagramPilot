import { assertMatchesAll } from "./assertion-helpers.mjs";

export function assertYamlSourceRepairHint(message) {
  assertMatchesAll(message, [
    /YAML is the supported source format/,
    /\*\.dp\.yaml/,
  ]);
}
