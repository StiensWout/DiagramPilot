Status: completed

# Redesign public landing page with product storytelling

## Parent

- [PRD](../PRD.md)

## What to build

Redesign the Public Landing Page so it is more marketable and eye-catching
without becoming a generic SaaS page. The page should lead with the Public
Landing Page Promise: diagrams are repository files an AI coding agent can
safely change, validate, and commit.

## Acceptance criteria

- [x] The landing page H1 remains `DiagramPilot`.
- [x] The primary promise is visible in the first viewport.
- [x] The page positions DiagramPilot as a local-first, repo-native diagram
      compiler for AI coding agents.
- [x] The page does not mention unbuilt MCP, future integrations, or internal
      design decisions.
- [x] The hero may use a custom or generated visual if it markets the product
      better than the current raw checkout SVG.
- [x] The landing page is a standalone Astro page, not a Markdown/Starlight
      splash rendering.
- [x] The landing page is full width with no landing-page top bar; Starlight
      chrome remains available on Public Documentation routes.
- [x] The generated hero visual shows the source, validation, and artifact
      story without relying on raw checkout SVG framing.
- [x] Primary actions route to the canonical quickstart and Public
      Documentation.
- [x] Cards or framed sections are allowed only when they serve clear hierarchy;
      generic feature-card grids, pricing cards, and decorative card stacks are
      avoided.
- [x] The visual system uses `ui-ux-pro-max` guidance: strong contrast,
      readable typography, restrained motion, visible focus states, responsive
      layout, and reduced-motion support.
- [x] The page uses no pricing, signup, hosted workspace, hosted storage, or
      prompt-only generation claims.
- [x] Website tests cover key landing content and forbidden public claims.

## Blocked by

- [48 Current-state public surface and quickstart](./48-current-state-public-surface-and-quickstart.md)

## Validation plan

```bash
npm --workspace website run build
node --test --test-concurrency=1 test/website-public-landing-page.test.mjs
npm --workspace website run test
npm test
git diff --check
```

## Implementation notes

- Reworked the public landing page around the Public Landing Page Promise:
  diagrams are repository files an AI coding agent can safely change, validate,
  and commit.
- Replaced the markdown landing route with a standalone
  `website/src/pages/index.astro` page while keeping Starlight for `/docs/*`.
- Removed the rejected command-list, generated-example, and rendered-output
  content blocks from the landing page.
- Generated a project-local landing hero visual:
  `website/public/landing/hero-workflow.png`.
- Removed the second image from the reviewable-artifacts section after design
  review.
- Removed speculative output wording from the landing page and kept the copy
  scoped to shipped SVG, Mermaid, and D2 behavior.
- Added landing tests for hero placement of the promise, generated product
  visuals, removed section copy, forbidden public claims, focus-visible styling,
  smooth motion hooks, reduced-motion support, and avoiding decorative radial
  backgrounds.
- Reworked the landing page toward the `t3.codes` visual direction with a
  centered dark developer-product hero, generated wide product imagery, and
  short proof sections.
- Removed the Starlight root markdown page and updated website scaffold,
  public-boundary, and documentation-contract tests to treat `/` as a custom
  Astro route.
- Added a restrained animation system: transform/opacity hero entrance,
  IntersectionObserver scroll reveals for lower sections, image hover settling,
  and `prefers-reduced-motion` fallbacks.

## Validation results

```bash
npm --workspace website run build
node --test --test-concurrency=1 test/website-public-landing-page.test.mjs
node --test --test-concurrency=1 test/website-scaffold.test.mjs test/docs-public-boundary.test.mjs test/documentation-contract.test.mjs
npm --workspace website run test
npm test
git diff --check
```

- `npm --workspace website run build` passed.
- `node --test --test-concurrency=1 test/website-public-landing-page.test.mjs`
  passed.
- `node --test --test-concurrency=1 test/website-scaffold.test.mjs
  test/docs-public-boundary.test.mjs test/documentation-contract.test.mjs`
  passed.
- `npm --workspace website run test` passed.
- `npm test` passed.
- `git diff --check` passed.
- Local dev server checks confirmed `/` includes the generated landing assets
  and no removed section copy, while `/docs/` retains the Starlight docs shell.
