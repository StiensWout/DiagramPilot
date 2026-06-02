Status: ready-for-agent

# Export valid DiagramSpec to Mermaid on stdout

## Parent

- [PRD](../PRD.md)

## What to build

Implement Mermaid export for a valid DiagramSpec and print it to stdout by
default. This slice should establish a stable export adapter without rewriting
the DiagramPilot Source File.

## Acceptance criteria

- [ ] `diagrampilot export <path> --format mermaid` prints Mermaid text to
      stdout for a valid source file.
- [ ] Export requires valid input and fails cleanly when validation fails.
- [ ] Tests cover representative diagrams and confirm the source file is not
      rewritten.

## Blocked by

- [08 Validate basic edge semantics between Nodes](./08-validate-basic-edge-semantics-between-nodes.md)
- [09 Validate Group containment and nesting rules](./09-validate-group-containment-and-nesting-rules.md)
- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
- [11 Validate Source Reference and External Reference metadata semantics](./11-validate-source-reference-and-external-reference-metadata.md)
