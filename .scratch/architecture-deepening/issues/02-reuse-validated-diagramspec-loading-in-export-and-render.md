Status: ready-for-agent

# Reuse validated DiagramSpec loading in export and render

## Parent

- [PRD](../PRD.md)

## What to build

Route `export` and `render` through the validated DiagramSpec loading module so
the source loading, validation, failure ordering, and valid DiagramSpec handoff
are shared across commands.

This slice should preserve current CLI behaviour for Mermaid export, D2 export,
and SVG rendering. Export should still print to stdout by default and write only
when `--out` is provided. Render should still require an explicit output path
and should still validate before writing a Derived Artifact.

## Acceptance criteria

- [ ] `export` uses the shared validated DiagramSpec loading path before producing Mermaid or D2 text.
- [ ] `render` uses the shared validated DiagramSpec loading path before producing SVG.
- [ ] Invalid DiagramPilot Source Files still fail before export or render output is written.
- [ ] `export` stdout, `--out`, and source-preservation behaviour remains unchanged.
- [ ] `render --out` behaviour, missing-output-path behaviour, and source-preservation behaviour remains unchanged.
- [ ] Existing export and render smoke coverage continues to pass.

## Blocked by

- [01 Add validated DiagramSpec loading for validate](./01-add-validated-diagramspec-loading-for-validate.md)
