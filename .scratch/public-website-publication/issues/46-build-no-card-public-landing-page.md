Status: completed

# Build no-card public landing page

## Parent

- [PRD](../PRD.md)

## What to build

Build the first Public Landing Page for DiagramPilot. It should be a concise
product entry page centered on the Checkout Demo Project and current CLI
workflow, using the real checkout SVG artifact as the primary visual and
avoiding card-based visual language entirely.

## Acceptance criteria

- [x] The landing page H1 is `DiagramPilot`.
- [x] The page positions DiagramPilot as a repo-native diagram compiler for AI coding agents.
- [x] The primary actions point to the Checkout Demo Project workflow and Public Documentation.
- [x] The first viewport uses the real checkout SVG artifact as a meaningful product visual.
- [x] The page includes current `check`, `validate`, `render`, and `export` commands.
- [x] The page explains DiagramSpec as the source of truth.
- [x] The page mentions review-stable SVG artifacts and deterministic provenance.
- [x] The page mentions First MCP Adapter as the next capability without claiming it is implemented.
- [x] The page makes no pricing, signup, hosted workspace, or prompt-to-diagram claims.
- [x] Custom website code uses no feature cards, pricing cards, CTA cards, floating panels, or boxed blurbs.
- [x] Normal docs primitives such as code blocks, tables, sidebars, nav, and search remain allowed.
- [x] A no-card verification check covers custom website code.
- [x] Desktop and mobile screenshots are reviewed or tested for layout, text fit, and non-overlap.

## Blocked by

- [44 Scaffold static Astro Starlight website](./44-scaffold-static-astro-starlight-website.md)
- [45 Publish docs-public through website routes](./45-publish-docs-public-through-website-routes.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run test
npm test
```

## Implementation notes

- Reworked the website root content page into a Starlight splash landing page
  whose hero H1 is `DiagramPilot`.
- Positioned DiagramPilot as a repo-native diagram compiler for AI coding
  agents and centered the copy on the current Checkout Demo Project CLI
  workflow.
- Added supported Starlight custom CSS for a no-card landing hero using the
  real checkout SVG artifact as the first-viewport product visual.
- Extended the website sync script to copy
  `demo-projects/checkout/docs/architecture.svg` into ignored website public
  assets during builds and dev startup.
- Added behavior coverage for the landing page content, forbidden public
  claims, no-card custom website source patterns, and the website-local test
  command.
- Changed website TypeScript config to extend Astro's strict config through an
  explicit filesystem path to avoid editor resolution errors for
  `astro/tsconfigs/strict`.
- Serialized root and website test runs because parallel website builds can
  race while rewriting `website/dist`.

## Validation performed

- `node --test test/website-public-landing-page.test.mjs` passed.
- `node --test test/website-scaffold.test.mjs` passed.
- `npm exec -- tsc -p website/tsconfig.json --noEmit` passed.
- `npm --workspace website run build` passed.
- `npm --workspace website run test` passed.
- `npm test` passed 114 tests.
- Desktop screenshot reviewed:
  `.scratch/public-website-publication/screenshots/46-landing-desktop.png`.
- Mobile screenshot reviewed:
  `.scratch/public-website-publication/screenshots/46-landing-mobile.png`.
