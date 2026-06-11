Status: completed

# Introduce Repo Workflow Artifact planning

## Parent

[PRD](../PRD.md)

## What to build

Create a Repo Workflow Artifact planning seam that turns each validated DiagramPilot Source File and its configured outputs into ordered Derived Artifact work items. The plan must preserve the current default SVG output behavior when no Repo Workflow Configuration outputs are present.

## Acceptance criteria

- [x] Configured output path resolution is available through the artifact plan.
- [x] Default next-to-source SVG output is represented through the artifact plan when no configured outputs apply.
- [x] Markdown outputs remain ordered after referenced artifacts.
- [x] No user-facing Repo Workflow Check or generation behavior changes.

## Blocked by

None - can start immediately

## Implementation notes

Added `createRepoWorkflowArtifactPlan` in core. The plan owns output selection, markdown-last ordering, absolute artifact paths, display paths, and Markdown embed references.

## Validation plan

- `npm run build && node --test test/repo-workflow-artifact-plan.test.mjs`
- `npm test`
- `npm run audit:fallow`
