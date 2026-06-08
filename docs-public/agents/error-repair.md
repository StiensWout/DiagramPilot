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

## Error Shape

Every structured validation error should include:

- `path`: exact spec path.
- `message`: concise explanation.
- `badValue`: the invalid value when available.
- `expected`: allowed shape or value.
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
