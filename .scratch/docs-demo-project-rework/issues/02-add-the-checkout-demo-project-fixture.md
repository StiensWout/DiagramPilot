Status: ready-for-agent

# Add the Checkout Demo Project fixture

## Parent

- [PRD](../PRD.md)

## What to build

Add a checked-in Checkout Demo Project that behaves like a small real
repository fixture. It should include repo-shaped source files, one excellent
architecture DiagramPilot Source File, and a rendered SVG Derived Artifact that
demonstrates validation, rendering, Stable IDs, groups, icons, edge labels, and
local Source References.

## Acceptance criteria

- [ ] The Demo Project contains realistic source files for a small checkout
      system without becoming a fully runnable application.
- [ ] The Demo Project contains exactly one canonical architecture DiagramPilot
      Source File for the initial demo.
- [ ] The demo DiagramPilot Source File validates with the real CLI.
- [ ] The demo renders an SVG Derived Artifact with the real CLI and an
      explicit output path.
- [ ] The demo diagram uses Stable IDs, useful labels, groups, icons, edge
      labels, and local Source References.
- [ ] The generated SVG includes deterministic provenance metadata and is not
      hand-edited.

## Blocked by

None - can start immediately.
