Status: ready-for-agent

# Build no-card public landing page

## Parent

- [PRD](../PRD.md)

## What to build

Build the first Public Landing Page for DiagramPilot. It should be a concise
product entry page centered on the Checkout Demo Project and current CLI
workflow, using the real checkout SVG artifact as the primary visual and
avoiding card-based visual language entirely.

## Acceptance criteria

- [ ] The landing page H1 is `DiagramPilot`.
- [ ] The page positions DiagramPilot as a repo-native diagram compiler for AI coding agents.
- [ ] The primary actions point to the Checkout Demo Project workflow and Public Documentation.
- [ ] The first viewport uses the real checkout SVG artifact as a meaningful product visual.
- [ ] The page includes current `check`, `validate`, `render`, and `export` commands.
- [ ] The page explains DiagramSpec as the source of truth.
- [ ] The page mentions review-stable SVG artifacts and deterministic provenance.
- [ ] The page mentions First MCP Adapter as the next capability without claiming it is implemented.
- [ ] The page makes no pricing, signup, hosted workspace, or prompt-to-diagram claims.
- [ ] Custom website code uses no feature cards, pricing cards, CTA cards, floating panels, or boxed blurbs.
- [ ] Normal docs primitives such as code blocks, tables, sidebars, nav, and search remain allowed.
- [ ] A no-card verification check covers custom website code.
- [ ] Desktop and mobile screenshots are reviewed or tested for layout, text fit, and non-overlap.

## Blocked by

- [44 Scaffold static Astro Starlight website](./44-scaffold-static-astro-starlight-website.md)
- [45 Publish docs-public through website routes](./45-publish-docs-public-through-website-routes.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run test
npm test
```
