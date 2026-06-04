Status: completed

# Update init guidance and build-aware validation plans

## Parent

- [PRD](../PRD.md)

## What to build

Update DiagramPilot adoption guidance emitted by `init` so new repositories see
`diagrampilot check` as the read-only repo review command before explicit
single-source repair and artifact refresh commands. Also make validation plans
for this phase build-aware when they run tests or commands that import compiled
workspace output.

This slice should keep Public Documentation, README workflow guidance, and the
Checkout Demo Project aligned with the current CLI contract.

## Acceptance criteria

- [x] `diagrampilot init` support-file guidance includes `diagrampilot check`.
- [x] `init` guidance describes `check` as read-only repo review/CI behaviour.
- [x] `init` guidance keeps `validate` as the explicit source repair command.
- [x] `init` guidance keeps `render <source> --out <artifact.svg>` as the explicit artifact refresh command.
- [x] Public Documentation and README workflow guidance remain aligned with the `init` guidance.
- [x] Tests cover the updated `init` support-file guidance.
- [x] Issue validation plans for this phase use `npm run build && node --test ...` when invoking tests that import compiled workspace output.
- [x] Final phase validation includes `npm test`, Checkout Demo Project text check, and Checkout Demo Project JSON check.

## Blocked by

- [39 Thin CLI check planning into an adapter](./39-thin-cli-check-planning-into-an-adapter.md)
- [40 Centralize provenance construction across render and check](./40-centralize-provenance-construction-across-render-and-check.md)

## Implementation notes

- Updated `diagrampilot init` support-file templates so new repositories see
  `diagrampilot check` before explicit `validate` and `render --out` repair
  commands.
- Described `check` as the read-only repo review/CI command in generated
  `llms.txt` and `docs/diagrampilot.md` guidance.
- Aligned root README, public `llms.txt`, and Checkout Demo Project README
  workflow guidance with the check-first adoption path.
- Added smoke coverage for generated `init` support-file guidance and public
  docs boundary coverage for README, `llms.txt`, and Checkout Demo Project
  workflow alignment.
- Audited this phase's existing issue validation plans; direct tests that
  import compiled workspace output use `npm run build && node --test ...`.

## Validation plan

- `npm run build && node --test test/cli-smoke.test.mjs test/docs-public-boundary.test.mjs`
- `npm test`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`

## Validation performed

- `npm run build && node --test test/cli-smoke.test.mjs test/docs-public-boundary.test.mjs` passed.
- `npm test` passed 99 tests.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check`
  passed.
- `cd demo-projects/checkout && node ../../packages/cli/dist/index.js check --json`
  passed.
