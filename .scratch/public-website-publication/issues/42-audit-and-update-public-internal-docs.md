Status: completed

# Audit and update public and internal docs

## Parent

- [PRD](../PRD.md)

## What to build

Audit DiagramPilot documentation against the current implemented product and
the Public Website Publication plan. Update stale public and internal claims
without moving the active Public Documentation or Internal Documentation roots.

This slice should preserve ADR 0006: Public Documentation stays in
`docs-public/`, while Internal Documentation, ADRs, and agent-skill setup stay
in `docs/`.

## Acceptance criteria

- [x] Public Documentation remains under `docs-public/`.
- [x] Internal Documentation, ADRs, and agent-skill setup remain under `docs/`.
- [x] ADR 0006 remains the active public/internal docs split decision.
- [x] README navigation reflects the current CLI, Public Website plan, and internal docs locations.
- [x] `llms.txt` reflects current public docs, schema expectations, and deferred MCP scope.
- [x] AGENTS guidance points to the correct public docs and internal docs.
- [x] Public Documentation describes current `check`, `validate`, `render`, and `export` behavior accurately.
- [x] Public Documentation does not describe deferred features as current behavior.
- [x] Internal roadmap and architecture notes no longer describe completed Repo Workflow Check work as the active next phase.
- [x] Checkout Demo Project docs remain aligned with the current read-only check workflow.
- [x] Existing docs-boundary tests are updated to match the active boundary and continue to protect internal docs from public links.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm run build && node --test test/docs-public-boundary.test.mjs test/checkout-demo-project.test.mjs
npm test
```

## Implementation notes

- Updated README navigation with the current `check`, `validate`, `render`, and
  `export` CLI shape plus the local Public Website Publication plan.
- Updated `llms.txt` with current public docs, DiagramSpec v1 schema
  expectations, the planned schema route, and deferred MCP scope.
- Updated AGENTS guidance to include the shipped read-only `check` workflow.
- Updated public MCP and prompting docs so deferred MCP/schema and source
  mutation features are not described as current behavior.
- Updated internal roadmap, architecture notes, and ADR 0007 to treat Repo
  Workflow Check and its deepening work as shipped, not active next-phase work.
- Extended `test/docs-public-boundary.test.mjs` to protect the active
  public/internal docs boundary and current docs claims.

## Validation results

Passed:

```bash
npm run build && node --test test/docs-public-boundary.test.mjs test/checkout-demo-project.test.mjs
npm test
```
