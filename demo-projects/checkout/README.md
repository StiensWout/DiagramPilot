# Checkout Demo Project

This fixture is a small repo-shaped checkout system for DiagramPilot examples.
It is intentionally not a runnable application; the source files are realistic
snippets that give the architecture diagram local code references.

Run the repo workflow from this directory:

```bash
diagrampilot check
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

Use `diagrampilot check` as the read-only repo review/CI command. Use
`validate` for explicit source repair and `render --out` to refresh the
explicit SVG artifact.
