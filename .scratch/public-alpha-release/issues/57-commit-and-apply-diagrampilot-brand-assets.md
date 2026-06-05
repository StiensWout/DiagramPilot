Status: completed
Issue Version: 0.1.3

# Commit and apply DiagramPilot Brand Assets

## Parent

- [PRD](../PRD.md)

## What to build

Commit canonical DiagramPilot Brand Assets outside the website and apply them
to public release surfaces where they improve product clarity without turning
website-generated files into the source of truth.

## Acceptance criteria

- [x] Canonical brand assets live in a root brand asset location such as
      `assets/brand/`.
- [x] The current untracked `diagrampilot-logo.svg` and `diagrampilot-mark.svg`
      assets are committed or replaced by equivalent canonical assets.
- [x] Website-public brand files are published copies or generated from the
      canonical brand assets.
- [x] The website favicon path is fixed; `website/src/pages/index.astro`
      should not reference a missing `/favicon.svg`.
- [x] The mark is used for favicon and icon-sized placements.
- [x] The wordmark is used only where there is enough space for it to remain
      legible.
- [x] README, Public Website, Public Documentation, and release surfaces use
      brand assets consistently where useful.
- [x] Brand usage does not make Internal Documentation or `.scratch/` planning
      content part of the Public Repository Surface.
- [x] Website route tests or visual checks verify the favicon and brand assets
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

- Added canonical DiagramPilot Brand Assets under `assets/brand/`:
  `diagrampilot-logo.svg` for light surfaces, `diagrampilot-logo-light.svg`
  for dark surfaces, and `diagrampilot-mark.svg` for the mark.
- Updated `website/scripts/sync-public-docs.mjs` so website-public brand files
  are generated from `assets/brand/` alongside the existing public docs, schema,
  llms.txt, and demo artifact sync.
- Removed `website/public/brand/` from tracked source and added it to
  `website/.gitignore`, leaving the generated website copy out of the committed
  source of truth.
- Updated the landing page and Starlight docs favicon configuration to use
  `/brand/diagrampilot-mark.svg` instead of the missing `/favicon.svg`.
- Updated the landing page hero to show the light wordmark while retaining one
  accessible `h1` for the product name.
- Removed the green hero eyebrow above the landing logo and increased the
  landing wordmark size.
- Added Starlight docs CSS so the Public Documentation index switches between
  the light-surface and dark-surface wordmark assets based on `data-theme`.
- Switched rendered docs wordmark image sources to root-relative `/brand/...`
  paths so local preview and production both load the generated website assets.
- Updated the README hero wordmark to use a `prefers-color-scheme` `<picture>`
  with the light wordmark in dark mode.
- Updated the public docs sync transform so Starlight uses the source Markdown
  `h1` as frontmatter title without rendering a duplicate in-page heading.
- Applied brand assets to README, Public Documentation, `llms.txt`, and the
  Brand Use Policy without linking Internal Documentation or `.scratch/`
  planning content from public surfaces.
- Added route and boundary tests covering canonical brand asset publication,
  favicon paths, generated website brand files, public-surface brand links,
  theme-compatible wordmarks, and duplicate-title prevention.
- Validation results on 2026-06-05 UTC:
  - `npm --workspace website run build` passed.
  - `npm --workspace website run test` passed: 17 tests.
  - `npm --workspace website run check:visual` passed.
  - `npm test` passed: 144 tests.
  - `git diff --check` passed.
