Status: ready-for-agent

# Render SVG through the included local D2 path

## Parent

- [PRD](../PRD.md)

## What to build

Implement `diagrampilot render <path> --out <artifact.svg>` so it validates the
source first and then renders SVG through the included local D2 path. The
command must require an explicit output path and avoid any separate manual D2
installation step.

## Acceptance criteria

- [ ] `diagrampilot render <path> --out <artifact.svg>` validates before
      rendering and fails cleanly on invalid input.
- [ ] `render` requires `--out` and writes SVG output when validation passes.
- [ ] A smoke test proves SVG rendering works through the included local D2
      path.

## Blocked by

- [13 Emit structured validation results with `validate --json`](./13-emit-structured-validation-results-with-json.md)
- [16 Export valid DiagramSpec to D2 on stdout](./16-export-valid-diagramspec-to-d2-on-stdout.md)
