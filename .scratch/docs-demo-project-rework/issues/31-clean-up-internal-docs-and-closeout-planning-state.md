Status: completed

# Clean up Internal Documentation and close out planning state

## Parent

- [PRD](../PRD.md)

## What to build

Clean up Internal Documentation after the public docs split so maintainer
workflow docs remain easy to find and do not duplicate public onboarding. Review
planning artifacts and record the current status of the completed MVP work and
the new docs/demo rework.

## Acceptance criteria

- [x] Internal Documentation clearly contains maintainer workflow docs, ADRs,
      roadmap material, and local issue-tracker guidance.
- [x] Internal docs point to Public Documentation only when maintainers need
      product usage docs, not as a substitute for workflow guidance.
- [x] The completed MVP planning state is reviewed and updated where
      appropriate.
- [x] The docs/demo rework issue files include implementation notes and
      validation plans as slices are completed.
- [x] Final validation commands are documented for maintainers to verify the
      public/internal docs split and demo workflow.

## Blocked by

- [28 Split Public Documentation and Internal Documentation roots](./28-split-public-and-internal-documentation-roots.md)
- [29 Add the Checkout Demo Project fixture](./29-add-the-checkout-demo-project-fixture.md)
- [30 Rework public docs around the Demo Project workflow](./30-rework-public-docs-around-the-demo-workflow.md)

## Implementation notes

- Added closeout coverage to `test/docs-public-boundary.test.mjs` for completed
  PRD planning state, README status text, release-readiness validation
  commands, and completed docs/demo issue notes.
- Updated `README.md` so the repository status records the completed MVP,
  architecture-deepening, and docs/demo rework checkpoints.
- Updated `docs/development/roadmap.md` so release readiness is recorded as
  complete, product backlog selection is the next planning state, and
  maintainer validation commands are explicit.
- Marked `.scratch/diagrampilot-mvp/PRD.md`,
  `.scratch/architecture-deepening/PRD.md`, and
  `.scratch/docs-demo-project-rework/PRD.md` as completed with closeout notes.
- Confirmed completed docs/demo issues include implementation notes and
  validation plans, and closed this final issue with the same structure.

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
node --test test/checkout-demo-project.test.mjs
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js validate docs/architecture.dp.yaml)
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg)
git diff --exit-code demo-projects/checkout/docs/architecture.svg
npm test
```
