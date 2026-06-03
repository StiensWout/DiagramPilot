Status: ready-for-agent

# Add review-stable SVG provenance and first acceptance-test coverage

## Parent

- [PRD](../PRD.md)

## What to build

Finish the MVP acceptance path by making rendered SVG output review-stable and
provenance-aware, then proving the documented workflow works end to end. This
slice should cover deterministic provenance metadata, no wall-clock timestamps,
and the first acceptance test driven by real CLI commands and public agent
docs.

## Acceptance criteria

- [ ] Rendered SVG includes deterministic provenance metadata such as source
      path, DiagramPilot version, renderer version, and source hash.
- [ ] Rendered SVG excludes wall-clock timestamps to avoid noisy diffs.
- [ ] End-to-end tests and docs prove an agent can follow the documented local
      workflow to validate and render a DiagramPilot Source File.
- [ ] All documentation is fully up to date to the current codebase, there is a clear distinction between developper documentation and end user/agent documentation.

## Blocked by

- [02 Add `diagrampilot init` support-file scaffolding](./02-add-init-support-file-scaffolding.md)
- [18 Validate and package Lucide Icon References](./18-validate-and-package-lucide-icon-references.md)
- [19 Render SVG through the included local D2 path](./19-render-svg-through-the-included-local-d2-path.md)
