Status: ready-for-agent
Issue Version: 0.2.2

# Add DOT export

## Parent

- [PRD](../PRD.md)

## What to build

Add DOT as an exported artifact through `diagrampilot export <path> --format
dot`. DOT should follow the existing export contract: stdout by default,
explicit file writes only with `--out`, and repairable diagnostics for invalid
input.

The output should use `digraph`, encode undirected edges with `dir=none`, and
represent groups as Graphviz clusters where practical without adding
Graphviz-specific DiagramSpec semantics.

## User stories covered

- 11-14

## Acceptance criteria

- [ ] `diagrampilot export <source> --format dot` writes DOT to stdout.
- [ ] `diagrampilot export <source> --format dot --out <path>` writes DOT only
      when the user explicitly provides `--out`.
- [ ] DOT output uses `digraph`.
- [ ] Undirected DiagramSpec edges are emitted with `dir=none`.
- [ ] Groups are emitted as Graphviz clusters where practical.
- [ ] Labels, Stable IDs, and metadata-derived output are escaped safely for
      valid DOT.
- [ ] Existing Mermaid and D2 export behavior remains unchanged.
- [ ] Invalid sources and unsupported options return repairable diagnostics.
- [ ] Tests cover stdout output, explicit writes, directed edges, undirected
      edges, group clusters, escaping, and existing export formats.

## Blocked by

None - can start immediately.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js export demo-projects/checkout/docs/architecture.dp.yaml --format dot
git diff --check
```
