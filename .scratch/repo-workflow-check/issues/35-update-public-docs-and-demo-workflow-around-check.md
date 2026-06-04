Status: completed

# Update public docs and demo workflow around check

## Parent

- [PRD](../PRD.md)

## What to build

After `diagrampilot check` is implemented, update Public Documentation and demo
workflow guidance so `check` is the repo-level review and CI command.

The docs should keep `validate` as the source repair command and `render` as the
explicit write command. They should not imply that `check` renders, fixes, or
updates artifacts.

## Acceptance criteria

- [x] Public quickstart introduces `diagrampilot check` as the review/CI command after the command exists.
- [x] Public docs explain that `check` is read-only.
- [x] Public docs explain that v1 `check` uses next-to-source same-stem Expected SVG Artifacts.
- [x] Public docs explain that SVG freshness is provenance-only in v1.
- [x] Public docs keep `validate` as the detailed source repair command.
- [x] Public docs keep `render <source> --out <artifact.svg>` as the explicit artifact repair command.
- [x] Public docs do not promise Mermaid, D2, DOT, or PNG artifact freshness.
- [x] Public docs do not mention configurable artifact mappings or ignore patterns as current behavior.
- [x] Demo workflow validation covers `diagrampilot check` against the Checkout Demo Project.
- [x] `llms.txt` continues to link only Public Documentation.

## Blocked by

- [34 Add check command planning with text and JSON output](./34-add-check-command-planning-with-text-and-json-output.md)

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
node --test test/checkout-demo-project.test.mjs
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
npm test
```

## Comments

Implemented 2026-06-04:

- Reworked the public quickstart to start the Checkout Demo Project workflow with `diagrampilot check` as the read-only repo review/CI command.
- Documented the v1 `check` boundary explicitly: next-to-source same-stem expected SVG artifacts, provenance-only SVG freshness, and no Mermaid/D2/DOT/PNG freshness checks.
- Kept `diagrampilot validate <source>` positioned as the detailed source repair command and `diagrampilot render <source> --out <artifact.svg>` as the explicit artifact repair path.
- Updated `README.md` so the top-level demo workflow matches the public quickstart instead of routing users directly into `validate`.
- Extended the public docs boundary and checkout demo tests to lock the new workflow behavior and confirm that demo `check` remains read-only.

Validation performed 2026-06-04:

- `node --test test/docs-public-boundary.test.mjs`
- `node --test test/checkout-demo-project.test.mjs`
- `(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)`
- `npm test` passed 76 tests.
