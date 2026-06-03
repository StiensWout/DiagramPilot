Status: completed

# Split Public Documentation and Internal Documentation roots

## Parent

- [PRD](../PRD.md)

## What to build

Separate Public Documentation from Internal Documentation while preserving the
public URL contract. Public usage docs should live in the public docs root and
remain written for agents and developers using DiagramPilot. Maintainer workflow
docs, ADRs, roadmap material, and issue-tracker guidance should remain internal.

## Acceptance criteria

- [x] Public-facing usage docs are located in the public docs root.
- [x] Internal maintainer docs remain in the internal docs tree.
- [x] Public docs links continue to use `https://diagrampilot.com/docs/...`.
- [x] `llms.txt` links only Public Documentation and does not expose internal
      maintainer workflow docs.
- [x] Repository guidance still points maintainers and agents to the internal
      issue-tracker, triage-label, domain-doc, roadmap, and ADR locations.

## Blocked by

None - can start immediately.

## Implementation notes

- Moved public-facing agent usage docs from `docs/agents/` to
  `docs-public/agents/`.
- Kept internal maintainer docs under `docs/`, including issue-tracker,
  triage-label, domain-doc, roadmap, architecture, and ADR material.
- Updated `llms.txt` so it links only Public Documentation through
  `https://diagrampilot.com/docs/...` URLs.
- Updated repository navigation in `AGENTS.md`, `README.md`, and internal
  architecture notes to reflect the public/internal documentation split.
- Added `test/docs-public-boundary.test.mjs` to cover the public docs root,
  internal docs tree, `llms.txt`, and repository navigation boundaries.

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
npm test
```
