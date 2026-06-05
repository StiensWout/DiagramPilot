Status: ready-for-agent

# Current-state public surface and quickstart

## Parent

- [PRD](../PRD.md)

## What to build

Rework the public-facing surface so `docs-public/`, `README.md`, `llms.txt`,
and Public Website copy describe shipped DiagramPilot behaviour only. Rework
the canonical quickstart into a clearer beginner guide without creating a
second source of truth.

## Acceptance criteria

- [ ] Public Documentation contains no public MCP plan or other unbuilt product
      capability guide.
- [ ] Public future-plan content is removed or moved to internal maintainer
      docs.
- [ ] `README.md` describes current DiagramPilot behaviour and public docs only.
- [ ] `llms.txt` links only current public docs and public artifacts.
- [ ] Public Website copy contains no MCP, future integration, or internal
      design-decision claims.
- [ ] `docs-public/agents/quickstart.md` is reworked as the canonical beginner
      quickstart.
- [ ] The quickstart covers install or local invocation assumptions, `check`,
      `validate`, `render --out`, `export`, expected outputs, and copying the
      source/render pattern into another repository.
- [ ] The quickstart keeps DiagramSpec as the source of truth and generated
      artifacts as derived outputs.
- [ ] The landing page, README, and `llms.txt` point users to the same canonical
      quickstart route.
- [ ] Tests verify the current-state public-surface rule.
- [ ] Tests verify the quickstart content and route links.

## Validation plan

```bash
rg -n "MCP|Model Context Protocol|planned|deferred|future|not implemented|source mutation" docs-public README.md llms.txt website/src
npm --workspace website run build
npm test
```
