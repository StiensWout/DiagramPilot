Status: completed

# Render SVG through the included local D2 path

## Parent

- [PRD](../PRD.md)

## What to build

Implement `diagrampilot render <path> --out <artifact.svg>` so it validates the
source first and then renders SVG through the included local D2 path. The
command must require an explicit output path and avoid any separate manual D2
installation step.

## Acceptance criteria

- [x] `diagrampilot render <path> --out <artifact.svg>` validates before
      rendering and fails cleanly on invalid input.
- [x] `render` requires `--out` and writes SVG output when validation passes.
- [x] A smoke test proves SVG rendering works through the included local D2
      path.

## Blocked by

- [13 Emit structured validation results with `validate --json`](./13-emit-structured-validation-results-with-json.md)
- [16 Export valid DiagramSpec to D2 on stdout](./16-export-valid-diagramspec-to-d2-on-stdout.md)

## Comments

Implemented 2026-06-03:

- Added pinned `@terrastruct/d2` dependency to `@diagrampilot/render-svg`.
- Implemented `renderDiagramSpecToSvg`, which exports DiagramSpec to D2,
  compiles it through the included local D2 WASM package, renders SVG, and
  terminates the D2 worker after rendering.
- Wired `diagrampilot render <path> --out <artifact.svg>` through the existing
  CLI source loading and validation diagnostics before any SVG is written.
- Updated CLI help and argument parsing so `render` requires an explicit
  `--out` path.
- Added CLI smoke coverage for successful SVG rendering, missing `--out`, and
  validation failure without artifact creation.

Validation plan:

- Run the render smoke tests:

  ```bash
npm run build
node --test --test-name-pattern "diagrampilot render" test/cli-smoke.test.mjs
  ```

- Run the full workspace suite:

  ```bash
npm test
  ```

- Run the whitespace check:

  ```bash
git diff --check
  ```

- Run this manual SVG render check:

  ```bash
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/docs"
printf 'version: 1\ntitle: Checkout Architecture\nnodes:\n  - id: web_app\n    label: Web App\n  - id: api_gateway\n    label: API Gateway\nedges:\n  - id: web_app_to_api_gateway\n    from: web_app\n    to: api_gateway\n    label: HTTPS\n' > "$tmpdir/docs/architecture.dp.yaml"
(cd "$tmpdir" && node /home/t3code/projects/DiagramPilot/packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg)
grep -q '<svg' "$tmpdir/docs/architecture.svg"
  ```

  Confirm the render command exits zero, writes `docs/architecture.svg`, and
  the SVG contains the expected labels.

Maintainer approval 2026-06-03:

The implementation change was approved after review. Status remains
`completed`.
