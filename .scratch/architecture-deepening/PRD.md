# DiagramPilot architecture deepening PRD

Status: completed

## Problem Statement

DiagramPilot has a working compiler-style MVP, but some of the core workflow is
spread across shallow modules. A maintainer or AFK agent who wants to change how
a DiagramPilot Source File becomes a valid DiagramSpec, how Groups are traversed
for Derived Artifacts, how Repairable Validation Errors are reported, or how
Review-Stable Rendering provenance is attached must understand several
implementation locations at once.

From the user's perspective, the CLI behaviour is correct, but the codebase is
harder to evolve than it needs to be. The same load, parse, validate, cast, and
failure-ordering steps appear in multiple commands. Group containment and Node
path knowledge is reconstructed by export adapters after validation has already
proven the same DiagramSpec rules. Diagnostics are partly core behaviour and
partly CLI formatting behaviour. Review-Stable Rendering provenance is partly
CLI source hashing and partly SVG metadata insertion.

This lowers locality. Bugs and changes around DiagramSpec validity, topology,
diagnostics, command behaviour, and provenance can leak across seams instead of
being fixed once behind a deep interface.

## Solution

Deepen the core DiagramPilot workflow without changing the public CLI contract
or DiagramSpec v1.

The primary solution is to introduce deeper modules for validated DiagramSpec
loading and DiagramSpec topology. The validated DiagramSpec loading module
should own the ordered lifecycle from explicit DiagramPilot Source File path to
either a valid DiagramSpec with source context or a diagnostic-friendly failure.
The DiagramSpec topology module should own reusable knowledge about Diagram
Objects: Stable ID lookup, Group roots, Group parentage, contained object
relationships, Node paths for export targets, and traversal order.

Supporting work should deepen diagnostics, CLI command planning, and Derived
Artifact provenance where doing so improves locality and test leverage. The CLI
should become a thin adapter over workflow modules. Mermaid, D2, and SVG
rendering should remain local Derived Artifact paths, but they should consume
shared topology and provenance behaviour rather than recomputing DiagramSpec
facts.

No user-facing behaviour should regress. Existing commands, stdout/stderr
rules, `--out` behaviour, validation semantics, D2 rendering, public docs URLs,
and generated artifact expectations remain intact.

## User Stories

1. As a DiagramPilot maintainer, I want source loading and DiagramSpec validation behind one deep module, so that command implementations do not repeat the same lifecycle.
2. As a DiagramPilot maintainer, I want `validate`, `export`, and `render` to share the same validated DiagramSpec path, so that changes to validation ordering have one implementation.
3. As an AFK implementation agent, I want a single source of truth for valid DiagramSpec loading, so that I do not need to infer ordering constraints from CLI command code.
4. As an AFK implementation agent, I want parse failures and read failures to flow through the same workflow as semantic validation failures, so that repair behaviour is consistent.
5. As an AI coding agent using DiagramPilot, I want existing validation text output to stay readable, so that terminal repair loops still work.
6. As an AI coding agent using DiagramPilot, I want existing validation JSON output to stay structured, so that automated repair loops still work.
7. As a CLI user, I want `validate` to continue reading one explicit DiagramPilot Source File path, so that validation does not unexpectedly scan a repository.
8. As a CLI user, I want `export` to continue validating before printing or writing Derived Artifact text, so that invalid DiagramSpec data does not produce misleading output.
9. As a CLI user, I want `render` to continue validating before writing SVG, so that invalid DiagramSpec data does not produce a generated artifact.
10. As a CLI user, I want `render` to continue requiring an explicit output path, so that file writes remain intentional.
11. As a CLI user, I want `export` to continue printing to stdout by default, so that exports remain pipe-friendly.
12. As a CLI user, I want `export` to continue writing only when `--out` is provided, so that Derived Artifacts are not created unexpectedly.
13. As a DiagramPilot maintainer, I want the CLI to be a thin adapter over workflow modules, so that CLI changes have better locality.
14. As a DiagramPilot maintainer, I want command planning separated from filesystem and process IO where practical, so that command behaviour can be tested without spawning the executable every time.
15. As an AFK implementation agent, I want command results to concentrate exit code, stdout, stderr, and write intent, so that tests can verify external behaviour directly.
16. As a test author, I want fewer broad process-spawn tests, so that the suite stays fast while preserving smoke coverage.
17. As a test author, I want high-level CLI smoke tests to remain, so that the real executable still proves the installed workflow.
18. As a DiagramPilot maintainer, I want DiagramSpec topology behind one deep module, so that Group and Node traversal rules do not leak across exporters.
19. As an export adapter author, I want to consume shared Group roots, so that Mermaid and D2 output order follows the same DiagramSpec interpretation.
20. As an export adapter author, I want to consume shared Group parentage, so that nested Groups are handled consistently across Derived Artifacts.
21. As an export adapter author, I want to consume shared Node paths where an export format requires them, so that path construction is not duplicated.
22. As a DiagramPilot maintainer, I want containment cycle and parentage knowledge to live near topology construction, so that Group bugs have one place to land.
23. As an AI coding agent updating diagrams, I want Stable ID rules to keep their current behaviour, so that existing DiagramPilot Source Files remain valid or invalid for the same reasons.
24. As a DiagramPilot maintainer, I want topology to preserve Diagram Object identity, so that Node, Edge, and Group references stay review-stable.
25. As a DiagramPilot maintainer, I want the topology module to avoid rewriting source, so that validation, export, and render keep DiagramPilot Source Files untouched.
26. As a DiagramPilot maintainer, I want Mermaid export to keep current visible output for existing valid DiagramSpec examples, so that architecture docs do not churn.
27. As a DiagramPilot maintainer, I want D2 export to keep current visible output for existing valid DiagramSpec examples, so that SVG rendering remains stable.
28. As a DiagramPilot maintainer, I want SVG rendering to keep using the local D2 path, so that ADR-0003 remains respected.
29. As a DiagramPilot maintainer, I want diagnostics behind a deeper module, so that parse failures, read failures, and Repairable Validation Errors share one reporting model.
30. As an AI coding agent using JSON validation output, I want structured errors to preserve path, message, bad value, expected value, and suggestion, so that repairs remain precise.
31. As a human CLI user, I want text diagnostics to preserve the current repair-friendly format, so that terminal output remains actionable.
32. As a future MCP adapter author, I want diagnostics to be reusable outside the CLI, so that MCP can wrap stable behaviour instead of reimplementing error mapping.
33. As a DiagramPilot maintainer, I want stdout/stderr rules to be represented by command behaviour, so that machine-consumable output remains clean.
34. As a DiagramPilot maintainer, I want Review-Stable Rendering provenance behind a deeper module, so that no-timestamp policy, source hash behaviour, and SVG metadata placement move together.
35. As a repository maintainer, I want rendered SVG provenance to keep recording source path, source hash, DiagramPilot version, and renderer name/version, so that Derived Artifacts stay traceable.
36. As a repository maintainer, I want rendered SVG provenance to keep excluding wall-clock timestamps, so that repeated renders do not create noisy diffs.
37. As a test author, I want provenance behaviour testable without invoking D2 for every assertion, so that deterministic artifact tests are focused.
38. As a DiagramPilot maintainer, I want D2-specific rendering behaviour to remain inside the render adapter, so that renderer implementation details do not leak into core workflow modules.
39. As a DiagramPilot maintainer, I want Icon Reference validation to keep its current behaviour, so that namespaced Lucide references remain supported and invalid references remain repairable.
40. As a future export adapter author, I want validated Icon Reference information to be available from the appropriate DiagramSpec model, so that future icon-aware Derived Artifacts can add behaviour without revalidating icon strings.
41. As a DiagramPilot maintainer, I want this architecture work to avoid new hosted dependencies, so that core workflows remain local-first.
42. As a DiagramPilot maintainer, I want this architecture work to avoid public docs URL changes, so that `https://diagrampilot.com` remains the public base.
43. As a DiagramPilot maintainer, I want this architecture work to avoid DiagramSpec schema churn, so that users do not need source migrations.
44. As an AFK implementation agent, I want the work split into small vertical slices, so that each issue can be validated independently.
45. As a code reviewer, I want each slice to preserve CLI behaviour, so that refactoring risk is controlled by external behaviour tests.
46. As a code reviewer, I want generated artifacts not to be hand-edited, so that output changes come only from render/export commands.
47. As a DiagramPilot maintainer, I want the deletion test to justify each new module, so that no new shallow modules are introduced.
48. As a DiagramPilot maintainer, I want each new seam to have at least current or near-term adapters, so that hypothetical abstraction is avoided.
49. As a DiagramPilot maintainer, I want module names to follow DiagramPilot domain language, so that future agents can navigate the codebase using `CONTEXT.md`.
50. As an AFK implementation agent, I want acceptance checks listed on each implementation issue, so that validation can be performed without re-reading the whole PRD.

## Implementation Decisions

- The work is an architecture deepening effort, not a user-facing feature change.
- DiagramSpec v1 remains the source-of-truth model and should not gain new fields for this work.
- Existing CLI command names, argument shapes, stdout behaviour, stderr behaviour, exit codes, and file-write rules remain the external contract.
- The top-priority module is validated DiagramSpec loading.
- The validated DiagramSpec loading module owns the ordered lifecycle from explicit DiagramPilot Source File path to valid DiagramSpec or diagnostic-friendly failure.
- The validated DiagramSpec loading module should preserve source context needed by callers, such as source path, Authoring Format where relevant, and original loaded value where it is still useful.
- CLI commands should consume validated DiagramSpec loading rather than repeating load, parse, validate, and cast logic.
- The validated DiagramSpec loading module should not write files or rewrite source.
- The second-priority module is DiagramSpec topology.
- DiagramSpec topology owns reusable knowledge about Diagram Objects, including Stable ID lookup, Group roots, Group parentage, containment relationships, Node paths, and traversal order.
- Validation and export adapters should consume shared topology where it improves locality.
- Mermaid and D2 export adapters remain responsible for target-specific syntax, escaping, direction names, and formatting.
- D2-specific Node path requirements should be supplied by topology or a topology-derived view rather than recomputed in the adapter implementation.
- Group containment semantics remain unchanged: Groups may contain Nodes and Groups, each contained object has at most one parent Group, Groups are not Edge endpoints, and containment cycles are invalid.
- Diagnostics should be deepened so read failures, parse failures, semantic validation failures, text output, and JSON output share one model.
- Repairable Validation Error content remains compatible with the current documented shape.
- CLI text formatting can be an adapter over diagnostic results.
- CLI JSON formatting can be an adapter over diagnostic results.
- CLI command planning is worth deepening after validated DiagramSpec loading and diagnostics are in place.
- Command planning should concentrate command output decisions: exit code, stdout content, stderr content, and write intent.
- Filesystem reads and writes should remain adapters at the edge of command execution.
- Process spawning should remain mostly a smoke-test seam, not the only practical test seam for command behaviour.
- Derived Artifact provenance is worth deepening where it reduces coupling between CLI hashing and SVG metadata insertion.
- The provenance module should own deterministic provenance construction, no-timestamp policy, and SVG metadata insertion rules where practical.
- D2 remains the default local SVG render adapter in line with ADR-0003.
- This work should not add DOT export, PNG rendering, MCP, project analyzers, watch mode, stale artifact checks, or source formatting.
- This work should not introduce a hosted-workspace dependency.
- This work should preserve unknown Metadata keys and current well-known Metadata validation semantics.
- This work should preserve Icon Reference validation for packaged Lucide icons.
- New modules should pass the deletion test: deleting them should cause complexity to reappear across command, validation, export, render, or test callers.
- New seams should be introduced only where they improve locality or have current adapters.
- If an issue needs to name a new domain concept not already in the domain glossary, update the glossary before relying on that term.

## Testing Decisions

- Good tests should assert external behaviour and module interfaces, not private helper implementation details.
- The highest existing seam remains the CLI executable for end-to-end smoke coverage.
- The new highest non-process seam should be validated DiagramSpec loading.
- Validated DiagramSpec loading tests should cover readable YAML, readable JSON, read failure, YAML parse failure, JSON parse failure, semantic validation failure, and valid DiagramSpec success.
- Validated DiagramSpec loading tests should assert failure ordering and failure shape without coupling to private parser helpers.
- The new topology seam should be tested with small valid DiagramSpec fixtures.
- Topology tests should cover root Nodes, root Groups, nested Groups, contained Node paths, contained Group paths where relevant, duplicate containment handling through validation, and traversal order used by exporters.
- Export tests should continue to assert Mermaid and D2 text for representative valid DiagramSpec fixtures.
- Export tests should verify that topology reuse does not change current expected output except where an explicit issue accepts a review-stable change.
- CLI command planning tests should assert exit code, stdout, stderr, and write intent directly when a command planning seam exists.
- CLI smoke tests should remain for real command invocation, package executable startup, validation, export, render, and `init`.
- Diagnostics tests should cover text and JSON adapters using the same underlying diagnostic result.
- Diagnostics tests should assert stdout/stderr routing at the command seam.
- Provenance tests should cover deterministic metadata construction and no wall-clock timestamp fields.
- Provenance tests should avoid invoking D2 when testing metadata insertion alone.
- Render smoke tests should still invoke the included local D2 path to prove SVG rendering works.
- Existing CLI smoke tests are prior art for command contract coverage.
- Existing core validation tests are prior art for DiagramSpec semantic validation.
- Existing icon tests are prior art for local packaged Lucide icon behaviour.
- Existing acceptance-style render tests are prior art for Review-Stable Rendering and provenance.
- Every implementation issue should include a validation plan with exact commands, consistent with the repo's agent work rules.

## Out of Scope

- Changing DiagramSpec v1 schema.
- Changing Stable ID rules.
- Changing Group containment semantics.
- Changing Edge endpoint semantics.
- Changing current Icon Reference validation semantics.
- Changing public CLI command names or documented argument shapes.
- Changing `render` to allow implicit output paths.
- Changing `export` to write files without `--out`.
- Rewriting DiagramPilot Source Files during validation, export, or render.
- Adding DOT export.
- Adding PNG rendering.
- Adding MCP implementation.
- Adding project analyzers.
- Adding watch mode.
- Adding stale artifact checks.
- Adding source formatting.
- Adding arbitrary per-object styling.
- Replacing D2 as the MVP SVG render path.
- Adding a hosted-workspace dependency.
- Publishing or deploying public docs.
- Hand-editing generated SVG artifacts.

## Closeout Notes

Reviewed during docs/demo closeout. All architecture-deepening issue slices
under `.scratch/architecture-deepening/issues/` are completed, and the current
architecture notes treat validated DiagramSpec loading, DiagramSpec topology,
diagnostics, provenance, and command planning as implemented architecture.

Validation:

```bash
npm test
```

## Further Notes

This PRD was synthesized from the architecture review performed on 2026-06-03.
The review found strongest leverage in two deepening candidates: validated
DiagramSpec loading and DiagramSpec topology. Diagnostics, CLI command planning,
and Derived Artifact provenance are included as supporting slices because they
improve locality around the same workflow.

The repo was already on `docs-demo-project-rework` with unrelated local changes
when this PRD was created. Those changes were treated as user-owned context and
were not reverted.
