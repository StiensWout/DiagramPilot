Status: ready-for-agent

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

- [ ] The public quickstart uses the Checkout Demo Project as the primary
      worked workflow.
- [ ] Public docs explain DiagramPilot Source Files, Derived Artifacts,
      validation before rendering, SVG provenance, and export stdout/file
      behavior using current CLI behavior.
- [ ] Public examples are corrected so they do not reference stale packages or
      deferred features as current behavior.
- [ ] README navigation points users and agents to the public demo workflow.
- [ ] Public docs remain Agent-First Documentation with explicit paths,
      commands, and validation expectations.

## Blocked by

- [01 Split Public Documentation and Internal Documentation roots](./01-split-public-and-internal-documentation-roots.md)
- [02 Add the Checkout Demo Project fixture](./02-add-the-checkout-demo-project-fixture.md)
