# Error Repair

DiagramPilot validation errors should be written so AI agents can fix specs
without guessing.

## Validation Behavior

`diagrampilot validate` validates DiagramPilot source files only. It does not
check whether generated SVG, Mermaid, D2, DOT, PNG, or Markdown embed artifacts
are fresh.

Validation should collect all errors that can be safely found in one pass. A
parse error may stop validation early because there may be no usable spec tree.

The default CLI output is concise human-readable text. Use `--json` for
structured agent-readable output:

```bash
diagrampilot validate docs/architecture.dp.yaml --json
```

Validation exits with a nonzero status when any file is invalid.

## Repairable Validation Errors

Repairable Validation Errors are part of DiagramPilot's agent-safe compiler
workflow. It does not mean DiagramPilot edits the source automatically. It means
validation reports the exact DiagramSpec path, the problem, and a concrete
repair step so an agent can update the DiagramPilot Source File deliberately.

Broken DiagramPilot Source File:

```yaml
version: 1
title: Checkout Repair Example
direction: right
nodes:
  - id: web_app
    label: Web App
  - id: api_gateway
    label: API Gateway
edges:
  - id: web_app_to_api_gateway
    from: storefront
    to: api_gateway
    label: HTTPS
```

Text validation output:

```bash
diagrampilot validate docs/checkout.dp.yaml
```

```text
DiagramSpec validation error in docs/checkout.dp.yaml: edges[0].from references unknown node "storefront".
  Path: edges[0].from
  Problem: edges[0].from references unknown node "storefront".
  Bad value: "storefront"
  Expected: One of: web_app, api_gateway.
  Suggestion: Add a node with id "storefront" or change edges[0].from to an existing node ID.
```

JSON validation output:

```bash
diagrampilot validate docs/checkout.dp.yaml --json
```

```json
{
  "file": "docs/checkout.dp.yaml",
  "ok": false,
  "errors": [
    {
      "path": "edges[0].from",
      "message": "edges[0].from references unknown node \"storefront\".",
      "badValue": "storefront",
      "expected": "One of: web_app, api_gateway.",
      "suggestion": "Add a node with id \"storefront\" or change edges[0].from to an existing node ID."
    }
  ]
}
```

Corrected source:

```yaml
version: 1
title: Checkout Repair Example
direction: right
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

## Safe Fix Command

`diagrampilot fix <path>` is a constrained Source Mutation command for
deterministic repairs. It writes only the DiagramPilot Source File, never
Derived Artifacts, and validates again after applying listed repairs. When the
post-fix source is still invalid, it refuses to write and reports the remaining
repairable diagnostics.

Use JSON planning mode before mutation when an agent needs to inspect the exact
repair plan:

```bash
diagrampilot fix docs/icons.dp.yaml --fallback-icon lucide:database --json
```

Example broken source with a configured deterministic fallback:

```yaml
version: 1
title: Icon Repair Example
nodes:
  - id: database
    label: Database
    icon: lucide:databse
```

Example JSON plan:

```json
{
  "file": "docs/icons.dp.yaml",
  "ok": true,
  "changed": true,
  "repairs": [
    {
      "kind": "replace-icon",
      "path": "nodes[0].icon",
      "message": "Replace invalid icon with configured fallback lucide:database.",
      "before": "lucide:databse",
      "after": "lucide:database"
    }
  ],
  "validation": {
    "ok": true,
    "errors": []
  }
}
```

Apply the deterministic repair only after reviewing the plan:

```bash
diagrampilot fix docs/icons.dp.yaml --fallback-icon lucide:database
```

The first supported repair set is intentionally narrow:

- canonical source formatting for valid DiagramPilot Source Files;
- replacement of unknown `lucide:*` icons only when `--fallback-icon` names a
  packaged Lucide icon.

Manual agent judgment is still required for ambiguous repairs. `fix` does not
choose unique duplicate IDs, invent missing nodes for broken edge references,
choose between multiple valid edge endpoints, repair YAML parse errors, or
refresh stale Derived Artifacts. Use `validate` for source diagnostics, then
edit the source deliberately. Use `render`, `export`, or `generate` to refresh
Derived Artifacts after the source is valid.

## Error Shape

Every structured validation error should include:

- `path`: exact DiagramSpec path to inspect or edit.
- `message`: concise explanation of the problem. Text mode repeats this as
  `Problem`.
- `badValue`: the invalid value when available. Missing values may omit this
  field or render as `<missing>` in text output.
- `expected`: allowed shape or expected value.
- `suggestion`: concrete repair step.

Example:

```json
{
  "file": "docs/architecture.dp.yaml",
  "errors": [
    {
      "path": "edges[1].to",
      "message": "Edge target does not reference an existing node.",
      "badValue": "payment_db",
      "expected": "One of: web_app, api_gateway, orders_db",
      "suggestion": "Change edges[1].to to an existing node ID or add a node with id payment_db."
    }
  ]
}
```

Diagnostics and validation errors should go to stderr in text mode. JSON mode
should emit machine-readable validation results to stdout.

## Agent Repair Loop

1. Run validation.
2. Read all errors before editing.
3. Fix source specs only.
4. Preserve stable IDs unless an ID itself is invalid.
5. Re-run validation.
6. Render only after validation succeeds.

## Common Errors

Missing node ID:

```text
nodes[3].id is missing.
```

Repair:

```yaml
id: auth_service
```

Broken edge reference:

```text
edges[2].from references unknown node "frontend".
```

Repair by either changing the reference to an existing node ID or adding the
missing node.

Edge references a group:

```text
edges[1].to references group "backend"; edges must reference node IDs.
```

Repair by changing the edge endpoint to a node inside the group.

Duplicate IDs:

```text
groups[0].id duplicates nodes[1].id "api_gateway".
```

Repair by assigning a unique stable ID. IDs must be unique across nodes, edges,
and groups.

Invalid ID shape:

```text
nodes[0].id must match ^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$.
```

Repair:

```yaml
id: api_gateway
```

Invalid direction:

```text
direction must be one of: right, left, down, up.
```

Repair:

```yaml
direction: right
```

Unknown icon:

```text
nodes[2].icon references unknown Lucide icon "databse".
```

Repair:

```yaml
icon: lucide:database
```

Group cycle:

```text
groups[2].contains creates a cycle: backend -> services -> backend.
```

Repair by removing one containment reference.

Duplicate containment:

```text
nodes[3] "orders_db" is contained by both "backend" and "data".
```

Repair by choosing one parent group.

## Error Message Quality Bar

Bad:

```text
Invalid diagram.
```

Good:

```text
edges[0].from references unknown node "client". Add a node with id "client" or change the edge to reference one of: web_app, api_gateway.
```
