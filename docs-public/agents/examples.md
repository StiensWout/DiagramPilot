# Examples

These examples show current DiagramPilot Source File patterns for common
software architecture diagrams. Use committed examples when you want a richer
reference, and use Source Creation templates when you want a small maintained
starting point.

## Maintained Templates

```bash
diagrampilot create docs/architecture.dp.yaml --template architecture
diagrampilot create docs/login-flow.dp.yaml --template flow
diagrampilot create docs/packages.dp.yaml --template package-map
diagrampilot create docs/system-context.dp.yaml --template system-context
diagrampilot create docs/service-map.dp.yaml --template service-map
```

Each command writes a valid `*.dp.yaml` file, refuses to overwrite an existing
file, and prints the next `validate` and `render` commands.

## Committed Example Sources

### Codebase Architecture

Path: `examples/codebase-architecture/codebase-architecture.dp.yaml`

```bash
diagrampilot validate examples/codebase-architecture/codebase-architecture.dp.yaml
diagrampilot render examples/codebase-architecture/codebase-architecture.dp.yaml --out examples/codebase-architecture/codebase-architecture.svg
diagrampilot export examples/codebase-architecture/codebase-architecture.dp.yaml --format mermaid
diagrampilot check examples/codebase-architecture
```

Use this when a repository needs a compact architecture view with Stable IDs,
Groups, local source metadata, and labeled request/write/event edges.

### Dependency Map

Path: `examples/dependency-map/dependency-map.dp.yaml`

```bash
diagrampilot validate examples/dependency-map/dependency-map.dp.yaml
diagrampilot render examples/dependency-map/dependency-map.dp.yaml --out examples/dependency-map/dependency-map.svg
diagrampilot export examples/dependency-map/dependency-map.dp.yaml --format mermaid
diagrampilot check examples/dependency-map
```

Use this for package dependency diagrams such as `packages/cli`,
`packages/core`, `packages/render-svg`, `packages/export-mermaid`,
`packages/export-d2`, `packages/export-dot`, and `packages/icons`.

### Service Boundary Map

Path: `examples/service-boundary-map/service-boundary-map.dp.yaml`

```bash
diagrampilot validate examples/service-boundary-map/service-boundary-map.dp.yaml
diagrampilot render examples/service-boundary-map/service-boundary-map.dp.yaml --out examples/service-boundary-map/service-boundary-map.svg
diagrampilot export examples/service-boundary-map/service-boundary-map.dp.yaml --format mermaid
diagrampilot check examples/service-boundary-map
```

Use this to review public, platform, and data boundaries without adding
per-object styling fields to DiagramSpec.

### Monorepo Overview

Path: `examples/monorepo-overview/monorepo-overview.dp.yaml`

```bash
diagrampilot validate examples/monorepo-overview/monorepo-overview.dp.yaml
diagrampilot render examples/monorepo-overview/monorepo-overview.dp.yaml --out examples/monorepo-overview/monorepo-overview.svg
diagrampilot export examples/monorepo-overview/monorepo-overview.dp.yaml --format mermaid
diagrampilot export examples/monorepo-overview/monorepo-overview.dp.yaml --format d2 --out examples/monorepo-overview/monorepo-overview.d2
diagrampilot export examples/monorepo-overview/monorepo-overview.dp.yaml --format dot --out examples/monorepo-overview/monorepo-overview.dot
diagrampilot check examples/monorepo-overview
```

This is the medium-complexity example. It demonstrates Stable IDs, Groups,
edge labels and edge kinds, local source references, export workflow commands,
and SVG Artifact Freshness. Run `render --out` before `check`; generated SVG
artifacts include deterministic DiagramPilot provenance with source path,
source hash, DiagramPilot version, and renderer identity.

### Pull Request Architecture Review

Path: `examples/pull-request-architecture-review/pull-request-architecture-review.dp.yaml`

```bash
diagrampilot validate examples/pull-request-architecture-review/pull-request-architecture-review.dp.yaml
diagrampilot render examples/pull-request-architecture-review/pull-request-architecture-review.dp.yaml --out examples/pull-request-architecture-review/pull-request-architecture-review.svg
diagrampilot export examples/pull-request-architecture-review/pull-request-architecture-review.dp.yaml --format mermaid
diagrampilot check examples/pull-request-architecture-review
```

Use this to show how a pull request can review changed source files,
DiagramPilot Source Files, Derived Artifacts, and repo workflow checks together.

### System Context Diagram

Path: `examples/system-context/system-context.dp.yaml`

```bash
diagrampilot validate examples/system-context/system-context.dp.yaml
diagrampilot render examples/system-context/system-context.dp.yaml --out examples/system-context/system-context.svg
diagrampilot export examples/system-context/system-context.dp.yaml --format mermaid
diagrampilot check examples/system-context
```

Use this for a C4-style context view of an AI coding agent, local repository,
DiagramPilot CLI, public docs, and pull request review.

## Intentionally Broken Repair Example

This broken source is for repair practice. Do not commit it as a passing
fixture. Save it temporarily as `docs/broken-architecture.dp.yaml`, then run:

```bash
diagrampilot validate docs/broken-architecture.dp.yaml
```

```yaml
version: 1
title: Broken Architecture
nodes:
  - id: web_app
    label: Web App
  - id: api_gateway
    label: API Gateway
edges:
  - id: web_app_to_missing_service
    from: web_app
    to: missing_service
    label: HTTPS
```

Expected diagnostic shape:

```text
edges[0].to references unknown node "missing_service".
Suggestion: Add a node with id "missing_service" or change edges[0].to to an existing node ID.
```

Repair by changing `edges[0].to` from `missing_service` to `api_gateway`, then
rerun `diagrampilot validate docs/broken-architecture.dp.yaml`.

## Small Inline Style Reference

```yaml
version: 1
title: Minimal Package Dependency
direction: right
nodes:
  - id: cli
    label: packages/cli
    kind: package
    icon: lucide:terminal
  - id: core
    label: packages/core
    kind: package
    icon: lucide:box
edges:
  - id: cli_to_core
    from: cli
    to: core
    label: validates source
    kind: imports
```
