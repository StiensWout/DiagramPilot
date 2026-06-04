# DiagramPilot MVP PRD

Status: completed

## Problem Statement

AI coding agents can create diagrams, but raw diagram formats are brittle as a
long-lived source of truth. Mermaid, D2, DOT, SVG, and PNG are useful outputs,
but they are hard for agents to update safely because identity, validation,
repair guidance, and generated artifact freshness are all implicit.

DiagramPilot needs an MVP that gives agents a repo-native workflow for creating,
validating, repairing, rendering, and exporting diagrams from a stable
DiagramSpec. The first implementation must make the source file reliable enough
to review in version control and the rendered artifact stable enough for code
review, without introducing a hosted workspace or project analyzer.

## Solution

Build the DiagramPilot MVP as a local-first TypeScript package workspace with a
real CLI, a DiagramSpec v1 schema, repairable validation errors, Mermaid and D2
export, SVG rendering through an included local D2 rendering path, and packaged
Lucide icon support.

From the user's perspective, an agent should be able to create a DiagramPilot
Source File, validate it, repair any validation errors directly in the source,
render an SVG artifact with an explicit output path, and optionally export
Mermaid or D2 text. DiagramSpec remains the source of truth; Derived Artifacts
are regenerated rather than hand-edited.

## User Stories

1. As an AI coding agent, I want to create a DiagramPilot Source File, so that a diagram has a stable repo-native source of truth.
2. As an AI coding agent, I want YAML to be the recommended Authoring Format, so that diagrams are easy to write and review.
3. As a tooling integrator, I want JSON source files to be supported, so that programmatic systems can generate DiagramSpec data.
4. As a repository maintainer, I want DiagramSpec v1 to have a documented schema, so that invalid diagrams can be caught before rendering.
5. As an AI coding agent, I want node, edge, and group IDs to be globally unique in one DiagramSpec, so that references are unambiguous.
6. As an AI coding agent, I want Stable IDs to use lowercase snake case, so that generated references are predictable and repairable.
7. As a repository maintainer, I want Stable IDs to survive label changes, so that diagram updates produce meaningful diffs.
8. As an AI coding agent, I want nodes to require labels, so that rendered diagrams are readable instead of showing only machine IDs.
9. As an AI coding agent, I want groups to require labels, so that visual containers are readable in rendered artifacts.
10. As an AI coding agent, I want edge labels to be optional, so that simple dependency graphs do not become noisy.
11. As an architecture author, I want edge labels when they clarify protocol or flow, so that readers understand relationships.
12. As an AI coding agent, I want edge endpoints to reference nodes only, so that rendering and export behavior is not ambiguous.
13. As an AI coding agent, I want edges to be directed by default, so that architecture and data-flow diagrams are straightforward.
14. As a diagram author, I want an explicit way to mark an edge as undirected, so that relationship maps can avoid false arrow semantics.
15. As an AI coding agent, I want edge IDs to remain stable when endpoints change, so that rerouted relationships can still be tracked.
16. As a diagram author, I want groups to contain nodes, so that related concepts can be visually organized.
17. As a diagram author, I want groups to contain other groups, so that larger diagrams can express nested structure.
18. As an AI coding agent, I want validation to reject group cycles, so that nested containment cannot become impossible to render.
19. As an AI coding agent, I want validation to reject duplicate containment, so that each contained object has one parent group in DiagramSpec v1.
20. As a diagram author, I want `kind` to be an open semantic tag, so that architecture diagrams, flowcharts, and dependency graphs can share one model.
21. As a renderer implementer, I want known kinds to be usable as rendering hints, so that common diagram objects can get reasonable visual treatment.
22. As a diagram author, I want unknown but valid kinds to remain valid, so that DiagramSpec can model domain concepts without waiting for enum updates.
23. As a diagram author, I want Icon References to use namespaces, so that icon names from different catalogs do not collide.
24. As a diagram author, I want packaged Lucide icons in the MVP, so that common service, database, security, and UI concepts can render with icons.
25. As an AI coding agent, I want validation to reject unsupported icon namespaces, so that icon mistakes are repaired before rendering.
26. As an AI coding agent, I want validation to reject unknown icon names in supported namespaces, so that typos do not silently degrade output.
27. As a diagram author, I want Metadata to preserve unknown keys, so that project-specific context can travel with DiagramSpec.
28. As an AI coding agent, I want `source` metadata to mean a local Source Reference, so that repo-native links are not confused with external URLs.
29. As a diagram author, I want `external_url` metadata to point outside the repository, so that outside references have a separate meaning.
30. As a diagram author, I want labels and descriptions to be plain text, so that exports do not depend on renderer-specific Markdown behavior.
31. As a diagram author, I want labels to allow line breaks, so that rendered diagrams can remain readable when names are long.
32. As an AI coding agent, I want `direction` to default to `right`, so that omitted layout direction still produces predictable output.
33. As a diagram author, I want `direction` to accept only the documented directions, so that layout intent is valid before rendering.
34. As a repository maintainer, I want DiagramSpec v1 to require at least one node, so that empty diagrams do not pass as useful diagrams.
35. As an AI coding agent, I want `validate` to accept explicit source paths, so that validation does not unexpectedly scan a repository.
36. As an AI coding agent, I want `validate` to collect all safely discoverable errors, so that I can repair a diagram in one focused edit.
37. As an AI coding agent, I want parse errors to stop validation early when needed, so that invalid syntax does not create misleading semantic errors.
38. As a human user, I want validation text output by default, so that terminal usage is readable.
39. As an AI coding agent, I want validation JSON output on request, so that repair loops can consume structured errors.
40. As an AI coding agent, I want Repairable Validation Errors to include spec path, bad value, expected value, and suggestion, so that fixes do not require guessing.
41. As a CLI user, I want validation to return a nonzero exit code on invalid source, so that CI and scripts can fail correctly.
42. As a CLI user, I want diagnostics to go to stderr, so that stdout remains machine-consumable where needed.
43. As a diagram author, I want `render` to require an explicit output path, so that file writes are intentional.
44. As a repository maintainer, I want rendered SVG output, so that diagrams can be committed and reviewed as project artifacts.
45. As a repository maintainer, I want SVG rendering to be stable enough for code review, so that repeated renders do not create noisy diffs.
46. As a repository maintainer, I want generated SVGs to include deterministic provenance metadata, so that artifacts can be traced back to their source.
47. As a repository maintainer, I do not want generated SVGs to include timestamps, so that rendering does not churn diffs.
48. As a CLI user, I want SVG rendering to work after installing DiagramPilot, so that I do not need a separate manual D2 installation.
49. As a CI user, I want renderer dependency resolution to happen at install time, so that failures do not appear halfway through rendering.
50. As a CLI user, I want `export` to print Mermaid or D2 text to stdout by default, so that agents can inspect or pipe exported output.
51. As a CLI user, I want `export` to write a file only when an output path is provided, so that exports do not create files unexpectedly.
52. As an AI coding agent, I want Mermaid export, so that DiagramPilot can interoperate with Markdown ecosystems.
53. As an AI coding agent, I want D2 export, so that DiagramPilot can interoperate with modern local diagram-as-code workflows.
54. As a repository maintainer, I want `init` to be low-risk, so that it does not scan the codebase or generate diagrams without an explicit request.
55. As a repository maintainer, I want `init` to create or update only support files, so that adopting DiagramPilot does not create surprise artifacts.
56. As an implementation agent, I want normalization to be internal, so that validate, render, and export do not rewrite source files.
57. As a repository maintainer, I want no arbitrary per-object styling in DiagramSpec v1, so that diagrams stay structural and portable.
58. As a diagram author, I want only top-level layout direction in the MVP, so that the first model does not lock in renderer-specific layout controls.
59. As an AI coding agent, I want generated artifacts to usually live next to source files, so that review is easy.
60. As a repository maintainer, I want artifact location to be explicit and flexible, so that project conventions can still be respected.
61. As a CI user, I want simple guidance for validating and rendering diagrams, so that repositories can enforce diagram health with normal shell commands.
62. As a product maintainer, I want DOT export deferred, so that the MVP can focus on validation, Mermaid export, D2 export, and SVG render.
63. As a product maintainer, I want PNG rendering deferred, so that rasterization does not distract from the compiler MVP.
64. As a product maintainer, I want MCP deferred until the CLI and core are useful, so that MCP wraps stable behavior instead of defining it prematurely.
65. As a product maintainer, I want project analyzers deferred, so that the MVP remains a compiler and validator rather than a code understanding system.
66. As a product maintainer, I want no hosted workspace dependency, so that DiagramPilot's core workflow stays local-first.
67. As an AI coding agent, I want public agent docs and `llms.txt`, so that I can discover the intended workflow without hidden project-specific instructions.
68. As a product maintainer, I want the first acceptance test to use real CLI commands, so that the MVP is not considered done when only documentation exists.

## Implementation Decisions

- The MVP is a TypeScript package workspace.
- DiagramPilot is a repo-native diagram compiler for AI coding agents, not a hosted canvas, prompt-to-diagram chatbot, or general-purpose visual editor.
- DiagramSpec is the structured data model and source of truth.
- DiagramPilot Source Files store DiagramSpec as YAML or JSON.
- YAML is the recommended Authoring Format for humans and agents.
- JSON is supported for tooling and programmatic integrations.
- Derived Artifacts include SVG, PNG, Mermaid, D2, and DOT; they are not the primary source of truth.
- MVP rendering produces SVG only.
- MVP export supports Mermaid and D2 only.
- DOT export, PNG rendering, MCP, project analyzers, watch mode, stronger layout configuration, generated Markdown embeds, stale artifact checks, source formatting, and cloud/provider icon catalogs are out of the MVP.
- DiagramSpec v1 uses one general graph-shaped model rather than separate diagram-type models.
- The MVP DiagramSpec has required top-level version, title, and nodes fields.
- DiagramSpec v1 requires at least one node.
- Direction defaults to `right` and accepts only `right`, `left`, `down`, and `up`.
- Descriptions are plain text.
- Labels are plain text and may include line breaks.
- Nodes require ID and label.
- Groups require ID, label, and contains.
- Edge IDs, node IDs, and group IDs share one global namespace within one DiagramSpec.
- Stable IDs use lowercase snake case and must match the accepted stable ID pattern.
- Stable IDs are preserved across updates unless the ID itself is invalid.
- Edge IDs are stable identities, not values that are regenerated automatically from endpoints.
- Edge endpoint-derived IDs remain a recommended default for newly created edges.
- Edges connect nodes only in DiagramSpec v1.
- Groups are not edge endpoints in DiagramSpec v1.
- Edges are directed by default, with an optional field for undirected connections.
- Groups may nest by containing other groups.
- Each contained node or group has at most one parent group.
- Validation rejects group cycles and duplicate containment.
- `kind` is an open semantic tag, not a strict enum.
- Known kinds may influence styling or export behavior.
- Unknown kinds remain valid if they use the stable ID shape.
- Icons are part of the MVP.
- Icon References are namespaced.
- MVP icon support is limited to packaged Lucide icons.
- Validation rejects unsupported icon namespaces.
- Validation rejects unknown icon names in supported namespaces.
- Cloud/provider icon namespaces are reserved for later phases.
- Metadata is a free-form extension object.
- Unknown metadata keys are preserved.
- `source` metadata means a local repository path or path-like glob.
- `external_url` metadata means an external URL.
- DiagramSpec v1 has no arbitrary per-object styling.
- MVP layout configuration is limited to top-level direction.
- Normalization is internal and does not rewrite source files.
- Source rewriting and formatting are deferred to explicit later tooling.
- `init` creates or updates support files only.
- `init` does not scan the codebase or generate a diagram by default.
- `validate` accepts explicit source file paths.
- `validate` validates source correctness only.
- `validate` does not check whether Derived Artifacts are fresh by default.
- `validate` collects all safely discoverable validation errors.
- Parse errors may stop validation early.
- Default validation output is human-readable text.
- Validation JSON output is available on request.
- Repairable Validation Errors include the invalid spec path, concise message, bad value when available, expected shape or value, and concrete suggestion.
- Validation exits nonzero when any source file is invalid.
- Diagnostics and validation errors go to stderr in text mode.
- JSON validation results go to stdout when JSON output is requested.
- `render` validates before rendering.
- `render` requires an explicit output path.
- `render` uses one default local SVG rendering path through D2.
- The DiagramPilot install includes the D2 rendering capability through a pinned, platform-specific renderer dependency.
- Users do not need a separate manual D2 installation or first-run renderer download.
- Rendered SVGs include deterministic provenance metadata, such as source path, DiagramPilot version, renderer version, and source hash.
- Rendered SVGs do not include wall-clock timestamps.
- Rendering is promised as stable enough for code review for the same DiagramPilot version, renderer version, input, and environment.
- `export` prints Mermaid or D2 text to stdout by default.
- `export` writes a file only when an explicit output path is provided.
- Generated artifacts are recommended to live next to their source files when practical, but this is not required.
- Public docs and URLs use the `diagrampilot.com` domain.
- The first acceptance test requires real local CLI commands to validate a source file and render an SVG artifact.

## Testing Decisions

- Tests should assert external behavior rather than private implementation details.
- The highest test seam is the CLI because the MVP is accepted through real local commands.
- CLI tests should cover exit codes, stdout, stderr, file writes, missing output path behavior, explicit path validation, JSON validation output, export stdout behavior, export output-file behavior, and render output behavior.
- CLI tests should verify diagnostics are not mixed into stdout for commands where stdout is machine-consumable.
- CLI tests should verify `render` requires an explicit output path.
- CLI tests should verify `export` prints to stdout by default and writes only when an output path is supplied.
- CLI tests should verify `init` does not scan the codebase or generate diagrams by default.
- Core validation tests should cover required top-level fields, at least one node, required labels, global duplicate IDs, invalid ID shape, invalid direction, broken edge references, group endpoints on edges, group cycles, duplicate containment, unknown icon namespaces, unknown supported icons, and metadata shape.
- Core validation tests should cover collecting multiple safely discoverable errors in one validation result.
- Core validation tests should cover parse errors as an early-stop case.
- Repairable Validation Error tests should assert the presence and usefulness of path, message, bad value, expected value, and suggestion.
- Schema tests should assert that the published schema matches the DiagramSpec v1 contract.
- Mermaid exporter tests should assert stable textual output for representative architecture, flowchart, dependency, and nested-group examples.
- D2 exporter tests should assert stable textual output for representative architecture, flowchart, dependency, and nested-group examples.
- Render smoke tests should assert a valid SVG is produced from a valid DiagramSpec using the included renderer path.
- Render provenance tests should assert deterministic provenance metadata is included and wall-clock timestamps are excluded.
- Icon tests should cover valid packaged Lucide icons and invalid icon references.
- Source preservation tests should verify validate, render, and export do not rewrite source files.
- Metadata tests should verify unknown metadata keys pass through validation and known metadata keys keep their documented meanings.
- Good tests should use small DiagramSpec fixtures that make the expected behavior obvious.
- Tests should avoid coupling to private normalization internals.
- Tests should avoid snapshotting large generated SVGs except where a focused provenance or smoke assertion is sufficient.
- There is no existing runtime test suite yet, so the first implementation should create the test seams at the CLI and core contract boundaries.
- The existing documentation and ADRs are prior art for expected behavior and should be treated as product contracts.

## Out of Scope

- Hosted canvas.
- Drag-and-drop editor.
- Prompt-only SaaS generation.
- Mermaid-only renderer positioning.
- DOT export.
- PNG rendering.
- MCP server.
- Project analyzers.
- Watch mode.
- Diagram discovery across a repository.
- Generated Markdown embeds.
- Stale artifact checks by default.
- Explicit source formatter.
- Arbitrary per-object styling.
- Stronger layout constraints beyond top-level direction.
- Full custom renderer.
- Large specialized diagram-type catalog.
- Full cloud/provider icon catalogs.
- Source mutation tools that preserve YAML comments and ordering.
- Account management.
- Hosted diagram storage.
- Visual editor state synchronization.
- Full workspace collaboration.

## Closeout Notes

Reviewed during docs/demo closeout. All MVP implementation issue slices under
`.scratch/diagrampilot-mvp/issues/` are completed, and the current roadmap
treats the MVP CLI shape as implemented product contract rather than active
planning state.

Validation:

```bash
npm test
```

## Further Notes

The settled decisions are captured in the domain glossary and ADRs. Agents
should use the glossary vocabulary when creating issues or implementation
plans: DiagramSpec, DiagramPilot Source File, Derived Artifact, Stable ID, Node,
Edge, Group, Kind, Icon Reference, Metadata, Source Reference, External
Reference, Repairable Validation Error, and Review-Stable Rendering.

The MVP should stay focused on the first acceptance test: an agent can read the
public agent docs, create a valid DiagramPilot Source File, validate it, and
render an SVG artifact with real local CLI commands.
