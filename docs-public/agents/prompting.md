# Prompting Guide

Use these instructions when asking an AI coding agent to create or update
DiagramPilot diagrams.

## Recommended Agent Instruction

```text
Create or update a DiagramPilot diagram in this repository.
Use a structured .dp.yaml source file, run the read-only repo check first,
preserve stable IDs, validate the spec, and render an SVG artifact with an
explicit --out path. Do not hand-edit generated artifacts.
```

## Architecture Prompt

```text
Create docs/architecture.dp.yaml showing the main runtime components in this
project. Use stable lowercase snake case IDs, group related services, include
labeled edges for major data flows, validate the spec, and render
docs/architecture.svg.
```

## Update Prompt

```text
Update the existing DiagramPilot source file to include the new payment service.
Preserve all existing IDs unless an ID is invalid. Add only the new nodes and
edges required, validate, and render the SVG again.
```

## Review Prompt

```text
Run diagrampilot check for this repository. Review .dp.yaml and .dp.json files
for broken references, duplicate IDs, invalid group containment, unknown icons,
unclear labels, and stale expected SVG artifacts. Report findings and fix only
the issues directly related to DiagramPilot diagrams.
```

## Export Prompt

```text
Export docs/architecture.dp.yaml to DOT and show me the output. Do not write an
exported file unless I ask for one.
```

Use `--out` when the exported Mermaid, D2, or DOT artifact should be written to
disk.

## Bad Prompt Pattern

```text
Make me a nice architecture diagram.
```

This is too vague. It does not specify where the source should live, whether to
validate, or how to preserve durable editability.

## Good Prompt Pattern

```text
Create a DiagramPilot source file at docs/architecture.dp.yaml for the auth,
API, worker, queue, and database components. Render docs/architecture.svg.
Use stable IDs and include labels on edges that describe protocols or data flow.
```
