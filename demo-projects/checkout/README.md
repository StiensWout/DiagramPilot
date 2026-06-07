# Checkout Demo Project

This fixture is a small repo-shaped checkout system for DiagramPilot examples.
It is intentionally not a runnable application; the source files are realistic
snippets that give the architecture diagram local code references.

Run the repo workflow from this directory:

```bash
diagrampilot check
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
diagrampilot export docs/architecture.dp.yaml --format dot --out docs/architecture.dot
```

Use `diagrampilot check` as the read-only repo review/CI command. Use
`validate` for explicit source repair and `render --out` to refresh the
explicit SVG artifact. `export` prints to stdout by default and writes a file
only when `--out` is provided.
