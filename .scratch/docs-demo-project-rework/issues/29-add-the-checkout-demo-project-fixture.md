Status: completed

# Add the Checkout Demo Project fixture

## Parent

- [PRD](../PRD.md)

## What to build

Add a checked-in Checkout Demo Project that behaves like a small real
repository fixture. It should include repo-shaped source files, one excellent
architecture DiagramPilot Source File, and a rendered SVG Derived Artifact that
demonstrates validation, rendering, Stable IDs, groups, icons, edge labels, and
local Source References.

## Acceptance criteria

- [x] The Demo Project contains realistic source files for a small checkout
      system without becoming a fully runnable application.
- [x] The Demo Project contains exactly one canonical architecture DiagramPilot
      Source File for the initial demo.
- [x] The demo DiagramPilot Source File validates with the real CLI.
- [x] The demo renders an SVG Derived Artifact with the real CLI and an
      explicit output path.
- [x] The demo diagram uses Stable IDs, useful labels, groups, icons, edge
      labels, and local Source References.
- [x] The generated SVG includes deterministic provenance metadata and is not
      hand-edited.

## Blocked by

None - can start immediately.

## Implementation notes

- Added the Checkout Demo Project under `demo-projects/checkout`.
- Added repo-shaped source snippets for the checkout page, API route, checkout
  service, payment provider, inventory service, orders repository, order event
  stream, and fulfillment worker.
- Added exactly one canonical DiagramPilot Source File at
  `demo-projects/checkout/docs/architecture.dp.yaml`.
- Generated the SVG Derived Artifact with the real CLI at
  `demo-projects/checkout/docs/architecture.svg`.
- Added `test/checkout-demo-project.test.mjs` to cover demo source discovery,
  real CLI validation, real CLI rendering, deterministic SVG provenance, source
  artifact freshness, groups, icons, edge labels, and local Source References.

## Validation plan

```bash
npm test
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js validate docs/architecture.dp.yaml)
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg)
git diff --exit-code demo-projects/checkout/docs/architecture.svg
```
