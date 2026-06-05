# Public Documentation

![DiagramPilot wordmark](https://diagrampilot.com/brand/diagrampilot-logo.svg)

DiagramPilot Public Documentation is for developers and AI coding agents using
DiagramPilot in their own repositories.

Start with the Checkout Demo Project quickstart:

- [Checkout demo quickstart](agents/quickstart.md)

Core public references:

- [DiagramSpec guide](agents/spec.md)
- [Error repair guide](agents/error-repair.md)
- [Agent examples](agents/examples.md)
- [Agent prompting guide](agents/prompting.md)
- [DiagramSpec v1 JSON Schema](https://diagrampilot.com/schema/diagramspec-v1.schema.json)

Current CLI commands:

```bash
diagrampilot init
diagrampilot check
diagrampilot check docs --json
diagrampilot validate docs/architecture.dp.yaml
diagrampilot validate docs/architecture.dp.yaml --json
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

Use `check` as the read-only repo review/CI command. `render` requires
`--out`. `export` prints to stdout by default and writes a file only when
`--out` is provided.

## Brand Assets

- [DiagramPilot wordmark](https://diagrampilot.com/brand/diagrampilot-logo.svg)
- [DiagramPilot mark](https://diagrampilot.com/brand/diagrampilot-mark.svg)
