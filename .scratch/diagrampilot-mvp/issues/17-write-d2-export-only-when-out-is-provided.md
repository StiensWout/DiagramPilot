Status: ready-for-agent

# Write D2 export only when `--out` is provided

## Parent

- [PRD](../PRD.md)

## What to build

Extend D2 export with explicit output-file behavior so users can choose between
stdout and file writes. The command must write a Derived Artifact only when
`--out` is supplied.

## Acceptance criteria

- [ ] D2 export writes a file only when `--out` is provided.
- [ ] Without `--out`, D2 export remains stdout-only.
- [ ] CLI tests cover both stdout and explicit file-output behavior.

## Blocked by

- [16 Export valid DiagramSpec to D2 on stdout](./16-export-valid-diagramspec-to-d2-on-stdout.md)
