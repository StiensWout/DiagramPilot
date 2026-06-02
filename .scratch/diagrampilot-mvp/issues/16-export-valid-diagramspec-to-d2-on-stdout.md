Status: ready-for-agent

# Export valid DiagramSpec to D2 on stdout

## Parent

- [PRD](../PRD.md)

## What to build

Implement D2 export for a valid DiagramSpec and print it to stdout by default.
This slice establishes the export adapter that the SVG render path will build
on later.

## Acceptance criteria

- [ ] `diagrampilot export <path> --format d2` prints D2 text to stdout for a
      valid source file.
- [ ] Export requires valid input and fails cleanly when validation fails.
- [ ] Tests cover representative diagrams and confirm the source file is not
      rewritten.

## Blocked by

- [08 Validate basic edge semantics between Nodes](./08-validate-basic-edge-semantics-between-nodes.md)
- [09 Validate Group containment and nesting rules](./09-validate-group-containment-and-nesting-rules.md)
- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
- [11 Validate Source Reference and External Reference metadata semantics](./11-validate-source-reference-and-external-reference-metadata.md)
