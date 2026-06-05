# DiagramSpec

DiagramSpec is the structured source model for DiagramPilot diagrams. It is
designed to be easier for AI coding agents to create, validate, repair, and
update than raw Mermaid, D2, DOT, or SVG.

## Source Files

DiagramSpec can be stored as YAML or JSON:

- `*.dp.yaml`
- `*.dp.json`

YAML is the recommended authoring format for humans and agents. JSON is
supported for tooling and programmatic integrations.

## JSON Schema Helper

DiagramSpec v1 has a generated, committed JSON Schema at:

```text
https://diagrampilot.com/schema/diagramspec-v1.schema.json
```

Use the schema as a helper for editors, code generators, and other tooling that
need machine-readable source shape. The schema captures required top-level
fields, node cardinality, object field shapes, direction values, stable ID
patterns, namespaced icon references, and well-known metadata references where
JSON Schema is practical.

The schema does not replace `diagrampilot validate`; core validation remains authoritative.
It covers source shape, while validation covers semantic rules such as global ID
uniqueness, edge endpoint references, group containment references, group
cycles, and supported Lucide icon names.

## Principles

- DiagramSpec is the source of truth.
- DiagramPilot source files are edited; derived artifacts are regenerated.
- Every diagram object has a globally unique stable ID.
- Stable IDs are preserved across updates.
- Rendering and export output is generated from the source file.
- Mermaid, D2, DOT, SVG, and PNG are derived artifacts, not primary source.

## Minimal DiagramSpec

```yaml
version: 1
title: Checkout Architecture
nodes:
  - id: web_app
    label: Web App
  - id: api_gateway
    label: API Gateway
edges:
  - id: web_app_to_api_gateway
    from: web_app
    to: api_gateway
    label: HTTPS
```

## Top-Level Fields

```yaml
version: 1
title: System Architecture
description: Optional plain-text summary.
direction: right
nodes: []
edges: []
groups: []
metadata: {}
```

Required top-level fields:

- `version`
- `title`
- `nodes`

`nodes` must contain at least one node.

Optional top-level fields:

- `description`
- `direction`
- `edges`
- `groups`
- `metadata`

## Field Contract

`version`
: Required. DiagramPilot spec version. Start with `1`.

`title`
: Required. Human-readable diagram title.

`description`
: Optional. Plain-text explanation of what the diagram represents.

`direction`
: Optional. Preferred layout direction: `right`, `left`, `down`, or `up`.
Defaults to `right`.

`nodes`
: Required. List of diagram nodes. Must contain at least one node.

`edges`
: Optional. List of connections between nodes.

`groups`
: Optional. Logical containers for nodes or other groups.

`metadata`
: Optional. Free-form object for project, source, owner, or generation details.
DiagramPilot preserves unknown metadata keys.

## IDs

All node, edge, and group IDs share one namespace inside a DiagramSpec. IDs must
be globally unique across all diagram objects.

IDs must use lowercase snake case:

```text
^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$
```

Good:

```text
api_gateway
orders_service
orders_db
web_app_to_api_gateway
```

Avoid:

```text
node1
boxA
new-api-gateway!!!
API Gateway
1_api_gateway
api__gateway
```

## Text

Labels and descriptions are plain text, not Markdown. Labels may include line
breaks when a rendered diagram needs them.

## Nodes

```yaml
nodes:
  - id: api_gateway
    label: API Gateway
    kind: service
    description: Routes public API traffic.
    icon: lucide:server
    metadata:
      source: src/gateway
      external_url: https://example.com/api-gateway-notes
```

Required node fields:

- `id`
- `label`

Optional node fields:

- `kind`
- `description`
- `icon`
- `metadata`

Nodes are the only valid edge endpoints in DiagramSpec v1.

## Kinds

`kind` is an open semantic tag. It is not a strict diagram type enum.

Known kinds may influence styling or export behavior, while unknown kinds remain
valid if they use the stable ID shape.

Examples:

```text
frontend
service
database
start
process
decision
package
```

## Icons

`icon` is an optional namespaced icon reference:

```yaml
icon: lucide:database
```

Icon namespaces use lowercase names. Lucide icon names use the packaged Lucide
kebab-case names, such as `database-backup`. MVP renderers support packaged
Lucide icons. Validation rejects unsupported icon namespaces and unknown icons
in supported namespaces.

Reserved icon namespaces include:

```text
aws
gcp
azure
custom
```

## Edges

```yaml
edges:
  - id: web_app_to_api_gateway
    from: web_app
    to: api_gateway
    label: HTTPS
    kind: request
    directed: true
```

Required edge fields:

- `id`
- `from`
- `to`

Optional edge fields:

- `label`
- `kind`
- `description`
- `directed`
- `metadata`

`from` and `to` must reference existing node IDs. Edges are directed by default.
Use `directed: false` for an undirected connection.

Edge IDs are stable identities. Endpoint-derived IDs are recommended for new
edges, but an existing edge ID should not be automatically regenerated when an
edge is rerouted.

## Groups

```yaml
groups:
  - id: backend
    label: Backend
    contains:
      - api_gateway
      - orders_service
      - orders_db
```

Required group fields:

- `id`
- `label`
- `contains`

Optional group fields:

- `kind`
- `description`
- `icon`
- `metadata`

`contains` may reference existing node IDs or group IDs. Groups may nest, but
validation rejects group cycles and duplicate containment. Each contained node
or group has at most one parent group in DiagramSpec v1.

Groups are not valid edge endpoints in DiagramSpec v1.

## Metadata

`metadata` is a free-form object. DiagramPilot may define well-known keys while
preserving unknown keys.

Well-known keys:

`source`
: Local repository path or path-like glob that connects the diagram concept to
repo content.

`external_url`
: External URL that points to supporting context outside the local repository.

## Styling And Layout

DiagramSpec v1 has no arbitrary per-object styling. Use `kind` and `icon` for
semantic rendering hints.

MVP layout configuration is limited to top-level `direction`.

## Interop

MVP export targets:

- Mermaid
- D2

MVP rendering target:

- SVG

Later targets:

- DOT
- PNG

Interop targets are not the source of truth.
