Status: ready-for-agent

# Reuse DiagramSpec topology in containment validation

## Parent

- [PRD](../PRD.md)

## What to build

Use the DiagramSpec topology module to improve locality for Group containment
validation. Validation should continue enforcing the same DiagramSpec v1 rules:
Groups may contain Nodes and Groups, each contained object has at most one
parent Group, Groups are not Edge endpoints, and containment cycles are invalid.

This slice should reduce repeated containment and Stable ID lookup knowledge
without changing which DiagramPilot Source Files are valid.

## Acceptance criteria

- [ ] Group containment validation consumes shared topology where it improves locality.
- [ ] Duplicate containment, unknown containment references, Edge containment, Group endpoint, and containment cycle failures keep current repairable behaviour.
- [ ] Valid nested Group fixtures remain valid.
- [ ] Validation does not rewrite DiagramPilot Source Files.
- [ ] Existing validation tests for Group containment, Edge endpoints, Stable IDs, Metadata, and Icon References continue to pass.

## Blocked by

- [04 Add DiagramSpec topology for export traversal](./04-add-diagramspec-topology-for-export-traversal.md)
