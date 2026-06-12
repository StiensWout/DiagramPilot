# @diagrampilot/core

Core DiagramSpec validation, readability linting, source loading, provenance,
and Repo Workflow Configuration behavior for DiagramPilot.

Most users should install the `diagrampilot` CLI. Use this package when you are
building tooling that needs DiagramPilot core behavior directly.

The core package supports YAML-only DiagramPilot Source Files, read-only repo
workflow checks and inspects, DiagramSpec lint warnings, configured artifact
freshness, fixed Output Profiles, first-class DiagramSpec view projections, and
deterministic source-fix planning, plus `generate` support for configured
Derived Artifacts and generated Markdown embed files.

Configured artifact profiles are `clean`, `compact`, `overview`, and
`presentation`. `overview` keeps topology while reducing edge-label noise for
dense generated review artifacts.

Public documentation:

- https://diagrampilot.com/docs/agents/spec.md
- https://diagrampilot.com/docs/agents/error-repair.md
- https://diagrampilot.com/docs/agents/quickstart.md
