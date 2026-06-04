Status: completed

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

- [x] Expected SVG Artifact paths are derived with the next-to-source same-stem convention.
- [x] Fresh SVG artifacts pass when provenance matches the current source and generation context.
- [x] Missing Expected SVG Artifacts are represented as artifact failures.
- [x] Unreadable SVG artifacts are represented separately from stale artifacts.
- [x] Malformed SVG or malformed provenance is represented separately from stale artifacts.
- [x] Missing DiagramPilot provenance is represented separately from stale artifacts.
- [x] Source hash mismatches are represented as stale artifacts.
- [x] Source path mismatches are represented as stale artifacts.
- [x] DiagramPilot version mismatches are represented as stale artifacts.
- [x] Renderer name or renderer version mismatches are represented as stale artifacts.
- [x] Invalid DiagramPilot Source Files can leave artifact freshness unchecked.
- [x] Freshness checks do not render, write files, update artifacts, or rewrite source files.
- [x] Tests cover fresh, missing, unreadable, malformed, missing provenance, stale reason, and invalid-source unchecked cases.

## Blocked by

- [32 Add repo workflow source discovery](./32-add-repo-workflow-source-discovery.md)

## Validation plan

```bash
npm test
node --test test/svg-artifact-freshness.test.mjs
```

## Comments

Implemented 2026-06-04:

- Added reusable SVG artifact freshness helpers to `@diagrampilot/core`, centered on `deriveExpectedSvgArtifactPath()` and `checkExpectedSvgArtifactFreshness()`.
- Kept the freshness check provenance-only and read-only: it validates the source, hashes current source content, reads the existing next-to-source SVG, and compares recorded provenance without rendering or writing files.
- Added explicit result states for `fresh`, `missing-artifact`, `unreadable-artifact`, `malformed-artifact`, `missing-provenance`, `stale`, and `unchecked`.
- Added stable stale-reason identifiers for source path, source hash, DiagramPilot version, renderer name, and renderer version mismatches.
- Left directory-scoped relative provenance path decisions to the caller through the explicit `provenanceSourcePath` input so the later `check` command can supply scope-relative paths.
- Added focused integration-style tests covering fresh artifacts, missing artifacts, unreadable artifacts, malformed SVG, malformed provenance JSON, missing provenance, stale mismatch reasons, and invalid-source unchecked behavior.

Validation plan:

```bash
npm test
node --test test/svg-artifact-freshness.test.mjs
```

Validation performed 2026-06-04:

- `npm test` passed 67 tests.
- `npm run build && node --test test/svg-artifact-freshness.test.mjs` passed 8 tests.
