Status: ready-for-agent

# Redesign public landing page with product storytelling

## Parent

- [PRD](../PRD.md)

## What to build

Redesign the Public Landing Page so it is more marketable and eye-catching
without becoming a generic SaaS page. The page should lead with the Public
Landing Page Promise: diagrams are repository files an AI coding agent can
safely change, validate, and commit.

## Acceptance criteria

- [ ] The landing page H1 remains `DiagramPilot`.
- [ ] The primary promise is visible in the first viewport.
- [ ] The page positions DiagramPilot as a local-first, repo-native diagram
      compiler for AI coding agents.
- [ ] The page does not mention unbuilt MCP, future integrations, or internal
      design decisions.
- [ ] The hero may use a custom or generated visual if it markets the product
      better than the current raw checkout SVG.
- [ ] The shipped workflow and real rendered output remain visible on the page.
- [ ] Primary actions route to the canonical quickstart and Public
      Documentation.
- [ ] Cards or framed sections are allowed only when they serve clear hierarchy;
      generic feature-card grids, pricing cards, and decorative card stacks are
      avoided.
- [ ] The visual system uses `ui-ux-pro-max` guidance: strong contrast,
      readable typography, restrained motion, visible focus states, responsive
      layout, and reduced-motion support.
- [ ] The page uses no pricing, signup, hosted workspace, hosted storage, or
      prompt-only generation claims.
- [ ] Website tests cover key landing content and forbidden public claims.

## Blocked by

- [48 Current-state public surface and quickstart](./48-current-state-public-surface-and-quickstart.md)

## Validation plan

```bash
npm --workspace website run build
npm --workspace website run test
npm test
```
