Status: ready-for-agent
Issue Version: 0.1.3

# Commit and apply DiagramPilot Brand Assets

## Parent

- [PRD](../PRD.md)

## What to build

Commit canonical DiagramPilot Brand Assets outside the website and apply them
to public release surfaces where they improve product clarity without turning
website-generated files into the source of truth.

## Acceptance criteria

- [ ] Canonical brand assets live in a root brand asset location such as
      `assets/brand/`.
- [ ] The current untracked `diagrampilot-logo.svg` and `diagrampilot-mark.svg`
      assets are committed or replaced by equivalent canonical assets.
- [ ] Website-public brand files are published copies or generated from the
      canonical brand assets.
- [ ] The website favicon path is fixed; `website/src/pages/index.astro`
      should not reference a missing `/favicon.svg`.
- [ ] The mark is used for favicon and icon-sized placements.
- [ ] The wordmark is used only where there is enough space for it to remain
      legible.
- [ ] README, Public Website, Public Documentation, and release surfaces use
      brand assets consistently where useful.
- [ ] Brand usage does not make Internal Documentation or `.scratch/` planning
      content part of the Public Repository Surface.
- [ ] Website route tests or visual checks verify the favicon and brand assets
      exist in the built site.

## Blocked by

- [56 Add MIT license package metadata tarball checks and brand policy](./56-add-mit-license-package-metadata-tarball-checks-and-brand-policy.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run test
npm --workspace website run check:visual
npm test
git diff --check
```

## Implementation notes

- Current untracked candidate assets are under `website/public/brand/`.
