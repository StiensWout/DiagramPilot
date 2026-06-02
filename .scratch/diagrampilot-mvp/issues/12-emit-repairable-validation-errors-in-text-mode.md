Status: ready-for-agent

# Emit Repairable Validation Errors in text mode

## Parent

- [PRD](../PRD.md)

## What to build

Turn semantic validation failures into Repairable Validation Errors that are
useful in terminal workflows. The default text output should make the invalid
spec path, problem, expected shape or value, and suggested repair obvious.

## Acceptance criteria

- [ ] Text-mode validation errors include spec path, concise message, expected
      value or shape, and a concrete repair suggestion.
- [ ] Validation collects all safely discoverable semantic errors in one run.
- [ ] CLI tests prove diagnostics stay on stderr and invalid validation exits
      nonzero.

## Blocked by

- [06 Enforce Stable ID format and global uniqueness](./06-enforce-stable-id-format-and-global-uniqueness.md)
- [07 Validate node and group label requirements](./07-validate-node-and-group-label-requirements.md)
- [08 Validate basic edge semantics between Nodes](./08-validate-basic-edge-semantics-between-nodes.md)
- [09 Validate Group containment and nesting rules](./09-validate-group-containment-and-nesting-rules.md)
- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
- [11 Validate Source Reference and External Reference metadata semantics](./11-validate-source-reference-and-external-reference-metadata.md)
