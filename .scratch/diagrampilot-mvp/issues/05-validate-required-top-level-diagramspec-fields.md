Status: ready-for-agent

# Validate required top-level DiagramSpec fields

## Parent

- [PRD](../PRD.md)

## What to build

Implement the first semantic validation layer for DiagramSpec so explicit-path
validation catches missing required top-level fields, invalid top-level
direction, and empty diagrams before render or export can run.

## Acceptance criteria

- [ ] Validation requires top-level `version`, `title`, and `nodes`.
- [ ] Validation rejects an empty `nodes` collection and invalid top-level
      `direction` values.
- [ ] CLI behavior is covered with readable stderr output and nonzero exit
      codes for invalid input.

## Blocked by

- [03 Parse YAML DiagramPilot Source Files from explicit paths](./03-parse-yaml-source-files-from-explicit-paths.md)
- [04 Parse JSON DiagramPilot Source Files from explicit paths](./04-parse-json-source-files-from-explicit-paths.md)
