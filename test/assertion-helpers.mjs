import assert from "node:assert/strict";

export function assertMatchesAll(actual, patterns) {
  for (const pattern of patterns) {
    assert.match(actual, pattern);
  }
}

export function assertMatchesNone(actual, patterns) {
  for (const pattern of patterns) {
    assert.doesNotMatch(actual, pattern);
  }
}
