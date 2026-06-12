import assert from "node:assert/strict";
import test from "node:test";

import {
  selectDiagramSpecView,
  validateDiagramSpec,
} from "../packages/core/dist/index.js";
import {
  assertProjectionResult,
  checkoutProjectionSpec,
  checkoutRuntimeProjectionExpectation,
} from "./diagramspec-projection-helpers.mjs";

test("selectDiagramSpecView returns a filtered valid DiagramSpec without mutating the source", () => {
  const spec = checkoutProjectionSpec({ withRuntimeView: true });
  const beforeProjection = JSON.stringify(spec);

  const result = selectDiagramSpecView(spec, "runtime");

  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(spec), beforeProjection);
  assertProjectionResult(result, checkoutRuntimeProjectionExpectation());
  assert.deepEqual(result.spec.views, spec.views);
  assert.deepEqual(validateDiagramSpec(result.spec), { ok: true, errors: [] });
});
