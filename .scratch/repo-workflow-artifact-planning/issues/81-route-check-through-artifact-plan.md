Status: completed

# Route read-only check through the artifact plan

## Parent

[PRD](../PRD.md)

## What to build

Route Repo Workflow Check through the shared Repo Workflow Artifact plan while preserving ADR-0007 read-only behavior and all current artifact freshness outcomes.

## Acceptance criteria

- [x] Repo Workflow Check uses the artifact plan for configured outputs.
- [x] Repo Workflow Check uses the artifact plan for the default SVG freshness check.
- [x] Check execution does not write files.
- [x] Existing check behavior and tests continue to pass.

## Blocked by

- [Issue 80](80-introduce-repo-workflow-artifact-planning.md)

## Implementation notes

Configured artifact checking now iterates planned outputs, and default SVG checking passes the planned default artifact path into the existing read-only SVG freshness checker. ADR-0007 remains intact because planning does not write.

## Validation plan

- `npm test`
- `npm run audit:fallow`
