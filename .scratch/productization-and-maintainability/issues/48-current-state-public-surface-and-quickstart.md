Status: completed

# Current-state public surface and quickstart

## Parent

- [PRD](../PRD.md)

## What to build

Rework the public-facing surface so `docs-public/`, `README.md`, `llms.txt`,
and Public Website copy describe shipped DiagramPilot behaviour only. Rework
the canonical quickstart into a clearer beginner guide without creating a
second source of truth.

## Acceptance criteria

- [x] Public Documentation contains no public MCP plan or other unbuilt product
      capability guide.
- [x] Public future-plan content is removed or moved to internal maintainer
      docs.
- [x] `README.md` describes current DiagramPilot behaviour and public docs only.
- [x] `llms.txt` links only current public docs and public artifacts.
- [x] Public Website copy contains no MCP, future integration, or internal
      design-decision claims.
- [x] `docs-public/agents/quickstart.md` is reworked as the canonical beginner
      quickstart.
- [x] The quickstart covers install or local invocation assumptions, `check`,
      `validate`, `render --out`, `export`, expected outputs, and copying the
      source/render pattern into another repository.
- [x] The quickstart keeps DiagramSpec as the source of truth and generated
      artifacts as derived outputs.
- [x] The landing page, README, and `llms.txt` point users to the same canonical
      quickstart route.
- [x] Tests verify the current-state public-surface rule.
- [x] Tests verify the quickstart content and route links.

## Implementation notes

- Removed the public MCP guide from `docs-public/agents/` and removed public
  MCP/future-plan references from `README.md`, `llms.txt`, and the website
  landing copy.
- Reworked `README.md` and `llms.txt` so they describe shipped behavior and
  route readers to current public docs and artifacts only.
- Added local invocation assumptions to the canonical quickstart, including
  `npm install`, `npm run build`, and the local CLI path for the checkout demo.
- Made the quickstart's source/render pattern copying guidance explicit for
  another repository.
- Updated public boundary and website landing tests to enforce current-state
  public copy and canonical quickstart routing.

## Validation plan

```bash
rg -n "MCP|Model Context Protocol|planned|deferred|future|not implemented|source mutation" docs-public README.md llms.txt website/src
npm --workspace website run build
npm test
```
