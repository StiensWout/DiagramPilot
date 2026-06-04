Status: completed

# Rework public docs around the Demo Project workflow

## Parent

- [PRD](../PRD.md)

## What to build

Rewrite Public Documentation so the Checkout Demo Project becomes the primary
"Try DiagramPilot" path. The quickstart should walk agents and developers
through the demo workflow with explicit files, commands, validation
expectations, rendering, provenance, and export behavior. Supporting public
reference docs should remain concise and should not duplicate internal
maintainer workflow guidance.

## Acceptance criteria

- [x] The public quickstart uses the Checkout Demo Project as the primary
      worked workflow.
- [x] Public docs explain DiagramPilot Source Files, Derived Artifacts,
      validation before rendering, SVG provenance, and export stdout/file
      behavior using current CLI behavior.
- [x] Public examples are corrected so they do not reference stale packages or
      deferred features as current behavior.
- [x] README navigation points users and agents to the public demo workflow.
- [x] Public docs remain Agent-First Documentation with explicit paths,
      commands, and validation expectations.

## Blocked by

- [28 Split Public Documentation and Internal Documentation roots](./28-split-public-and-internal-documentation-roots.md)
- [29 Add the Checkout Demo Project fixture](./29-add-the-checkout-demo-project-fixture.md)

## Implementation notes

- Reworked `docs-public/agents/quickstart.md` around the Checkout Demo Project
  workflow at `demo-projects/checkout`.
- Documented the demo DiagramPilot Source File, Derived Artifacts, validation
  expectations, SVG provenance keys, render `--out` behavior, and export
  stdout/file behavior.
- Updated `README.md` and `llms.txt` so public navigation points to the checkout
  demo quickstart.
- Corrected the public package dependency example to use current workspace
  packages and packaged Lucide icons.
- Expanded `test/docs-public-boundary.test.mjs` to cover the demo workflow,
  current artifact/CLI behavior, public examples, and packaged example icons.

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
npm test
```
