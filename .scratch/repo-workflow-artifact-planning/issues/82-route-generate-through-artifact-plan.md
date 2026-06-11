Status: completed

# Route generate through the artifact plan

## Parent

[PRD](../PRD.md)

## What to build

Route Repo Workflow Generate through the shared Repo Workflow Artifact plan while preserving existing write ordering, configured output behavior, and failure reporting.

## Acceptance criteria

- [x] Repo Workflow Generate uses the artifact plan for configured outputs.
- [x] Repo Workflow Generate uses the artifact plan for default SVG generation.
- [x] Markdown outputs are still written after referenced outputs.
- [x] Existing generate behavior and tests continue to pass.

## Blocked by

- [Issue 80](80-introduce-repo-workflow-artifact-planning.md)

## Implementation notes

Generation now consumes planned outputs and only produces content for each planned artifact. Local generate-output path/order/reference helpers were removed.

## Validation plan

- `npm run build && node --test test/repo-workflow-artifact-plan.test.mjs`
- `npm test`
- `npm run audit:fallow`
