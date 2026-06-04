Status: pending

# Add SVG provenance freshness checking

## Parent

- [PRD](../PRD.md)

## What to build

Add the reusable SVG Artifact Freshness checks for Expected SVG Artifacts.

For a valid DiagramPilot Source File, the Expected SVG Artifact is the
next-to-source SVG with the same filename stem. Freshness is provenance-only in
v1: read the existing SVG, extract DiagramPilot provenance metadata, and compare
the current generation context without rendering.

Freshness should compare:

- provenance source path
- source SHA-256 hash
- DiagramPilot version
- renderer name
- renderer version

Directory-scoped checks should compare provenance source paths relative to the
Check Scope.

## Acceptance criteria

- [ ] Expected SVG Artifact paths are derived with the next-to-source same-stem convention.
- [ ] Fresh SVG artifacts pass when provenance matches the current source and generation context.
- [ ] Missing Expected SVG Artifacts are represented as artifact failures.
- [ ] Unreadable SVG artifacts are represented separately from stale artifacts.
- [ ] Malformed SVG or malformed provenance is represented separately from stale artifacts.
- [ ] Missing DiagramPilot provenance is represented separately from stale artifacts.
- [ ] Source hash mismatches are represented as stale artifacts.
- [ ] Source path mismatches are represented as stale artifacts.
- [ ] DiagramPilot version mismatches are represented as stale artifacts.
- [ ] Renderer name or renderer version mismatches are represented as stale artifacts.
- [ ] Invalid DiagramPilot Source Files can leave artifact freshness unchecked.
- [ ] Freshness checks do not render, write files, update artifacts, or rewrite source files.
- [ ] Tests cover fresh, missing, unreadable, malformed, missing provenance, stale reason, and invalid-source unchecked cases.

## Blocked by

- [32 Add repo workflow source discovery](./32-add-repo-workflow-source-discovery.md)

## Validation plan

```bash
npm test
node --test test/render-svg-provenance.test.mjs
```

