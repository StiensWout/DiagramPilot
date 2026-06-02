Status: ready-for-agent

# Write Mermaid export only when `--out` is provided

## Parent

- [PRD](../PRD.md)

## What to build

Extend Mermaid export with explicit output-file behavior so users can choose
between stdout and file writes. The command must write a Derived Artifact only
when `--out` is supplied.

## Acceptance criteria

- [ ] Mermaid export writes a file only when `--out` is provided.
- [ ] Without `--out`, Mermaid export remains stdout-only.
- [ ] CLI tests cover both stdout and explicit file-output behavior.

## Blocked by

- [14 Export valid DiagramSpec to Mermaid on stdout](./14-export-valid-diagramspec-to-mermaid-on-stdout.md)
