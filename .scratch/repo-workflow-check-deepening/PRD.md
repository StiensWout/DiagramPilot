Status: ready-for-agent

# Deepen Repo Workflow Check

## Problem Statement

DiagramPilot now has a working read-only Repo Workflow Check, but the
implementation is still too shallow for the amount of product behaviour it
owns. From the maintainer's perspective, the visible command works, but the
knowledge needed to evaluate local diagram workflow health is split across CLI
planning, core source loading, SVG Artifact Freshness checking, render
provenance construction, and test fixtures.

That split lowers locality. A maintainer or AFK agent fixing one Repo Workflow
Check problem must know when a DiagramPilot Source File is loaded, when it is
validated, how the Expected SVG Artifact is derived, which provenance fields are
required, how malformed provenance should be classified, which result shape
text and JSON output expect, and which tests must be rebuilt before they are
trustworthy.

The clearest concrete failure found during review is that valid JSON provenance
with the wrong shape can throw during SVG Artifact Freshness comparison instead
of returning a repairable artifact state. The broader design issue is the same:
Repo Workflow Check has no deep module that owns the full check lifecycle.

## Solution

Deepen Repo Workflow Check into one core workflow module with a small external
interface and a larger implementation behind it. The module should own the
read-only lifecycle from Check Scope to aggregate check result: discovery,
validated DiagramSpec loading, Expected SVG Artifact derivation, provenance-only
SVG Artifact Freshness evaluation, provenance shape validation, failure
classification, and per-source result construction.

The CLI should become an adapter over that workflow result. It should parse
arguments, call the Repo Workflow Check module, format text or JSON output, and
materialize no writes. Render SVG should continue to own SVG rendering and SVG
metadata insertion. Shared provenance construction and validation should live
where both rendering and freshness checking can use one provenance model.

This preserves ADR-0007: `diagrampilot check` remains separate from `validate`,
read-only, and provenance-only. The work is an architecture deepening and
correctness fix, not a new artifact freshness feature.

## User Stories

1. As a DiagramPilot maintainer, I want Repo Workflow Check behaviour behind one deep module, so that check bugs have one place to land.
2. As a DiagramPilot maintainer, I want the check lifecycle to validate each DiagramPilot Source File once, so that duplicate load and validation work disappears.
3. As a DiagramPilot maintainer, I want SVG Artifact Freshness to receive already validated source context, so that artifact checks do not repeat source correctness work.
4. As an AFK implementation agent, I want the Repo Workflow Check module to own Expected SVG Artifact derivation, so that CLI formatting does not need artifact path rules.
5. As an AFK implementation agent, I want provenance shape validation to be explicit, so that malformed metadata never escapes as an uncaught runtime exception.
6. As a repository maintainer, I want valid JSON with missing provenance fields to be reported as malformed artifact evidence, so that CI output stays actionable.
7. As a repository maintainer, I want valid JSON with malformed renderer provenance to be reported as malformed artifact evidence, so that bad SVG metadata does not crash `check`.
8. As a repository maintainer, I want missing DiagramPilot provenance to stay distinct from malformed provenance, so that repair instructions remain precise.
9. As a repository maintainer, I want stale SVG Artifact reasons to stay explicit, so that agents can understand whether source path, source hash, DiagramPilot version, or renderer context changed.
10. As a repository maintainer, I want `diagrampilot check` to remain read-only, so that review and CI commands never rewrite DiagramPilot Source Files or Derived Artifacts.
11. As a CLI user, I want `diagrampilot check` text output to stay concise, so that multi-source failures are readable in terminal output.
12. As a CLI user, I want invalid DiagramPilot Source Files to point to `validate`, so that source repair remains a single-source loop.
13. As a CLI user, I want missing or stale Expected SVG Artifacts to point to `render`, so that artifact repair remains explicit.
14. As an AI coding agent, I want aggregate JSON check output to retain every checked source, so that scripts can inspect both fresh and failing sources.
15. As an AI coding agent, I want JSON artifact states to be typed and complete, so that stale, malformed, missing, unreadable, unchecked, and fresh artifacts can be handled separately.
16. As an AI coding agent, I want validation errors in check JSON to reuse repairable diagnostic shape, so that source repair logic can share existing validation behaviour.
17. As a future MCP adapter author, I want the check result model outside CLI text formatting, so that MCP can expose Repo Workflow Check without reimplementing CLI internals.
18. As a future test author, I want to test Repo Workflow Check at one high seam, so that tests do not need to reconstruct the same dependency web as the implementation.
19. As a code reviewer, I want the CLI command planning module to shrink, so that CLI review focuses on arguments, output routing, and write intent.
20. As a code reviewer, I want the core package to stop being one giant mixed module, so that source loading, validation, provenance, topology, and Repo Workflow Check concerns are navigable.
21. As a DiagramPilot maintainer, I want provenance construction to have one owner, so that rendering and freshness checks cannot drift.
22. As a DiagramPilot maintainer, I want the no-timestamp provenance policy to stay centralized, so that Review-Stable Rendering remains review-stable.
23. As a DiagramPilot maintainer, I want SVG metadata insertion to stay with the render SVG adapter, so that D2 rendering implementation details do not leak into Repo Workflow Check.
24. As a DiagramPilot maintainer, I want the source hash computation used by render and check to be the same behaviour, so that fresh artifact detection matches rendered provenance.
25. As a DiagramPilot maintainer, I want the check result model to encode unchecked artifact state for invalid sources, so that artifact freshness is not evaluated from invalid DiagramSpec data.
26. As a DiagramPilot maintainer, I want discovery failures to stay command failures, so that missing Check Scopes do not look like workflow health issues.
27. As a DiagramPilot maintainer, I want no-source directory checks to remain successful no-ops, so that empty repos can adopt DiagramPilot incrementally.
28. As a DiagramPilot maintainer, I want explicit unsupported source paths to remain command failures, so that users get immediate feedback on wrong extensions.
29. As a Demo Project maintainer, I want Checkout Demo Project check behaviour to keep passing, so that public docs stay aligned with the real workflow.
30. As a Public Documentation maintainer, I want `init` support-file guidance to match the current `check` workflow, so that newly adopted repos do not receive stale command guidance.
31. As a test author, I want individual direct test commands to be trustworthy, so that local validation does not silently run against stale compiled output.
32. As a test author, I want build-dependent tests to make the build requirement explicit, so that validation plans are not misleading.
33. As an AFK implementation agent, I want issue slices to preserve existing public CLI behaviour, so that every refactor can be reviewed through external behaviour.
34. As a maintainer, I want this work to avoid new public options, so that the shape of `diagrampilot check` stays stable.
35. As a maintainer, I want this work to avoid new artifact mapping config, so that the v1 Expected SVG Artifact convention stays simple.
36. As a maintainer, I want this work to avoid Mermaid, D2, DOT, or PNG freshness expansion, so that the architecture fix does not grow product scope.
37. As a maintainer, I want this work to avoid Git root auto-detection, so that Check Scope remains explicit and local.
38. As a maintainer, I want this work to avoid render comparison, so that Repo Workflow Check remains provenance-only.
39. As a maintainer, I want this work to avoid source rewrites, so that DiagramPilot Source Files remain user-owned input.
40. As a maintainer, I want each new module to pass the deletion test, so that the refactor removes complexity instead of spreading it.

## Implementation Decisions

- The top-level design decision is to create a deep Repo Workflow Check module rather than continuing to add check-specific branches in CLI planning.
- Repo Workflow Check owns the full read-only workflow from Check Scope to aggregate result.
- The CLI remains the command adapter. Its implementation should parse arguments, select text or JSON output, set exit code, and keep write intent empty.
- The existing command planning seam remains useful and should not be removed. It should depend on the deepened Repo Workflow Check module rather than reconstructing check results itself.
- The validated DiagramSpec loading module remains the source correctness seam for explicit DiagramPilot Source File paths.
- Repo Workflow Check should call validated DiagramSpec loading once per discovered source and carry the result forward into artifact evaluation.
- SVG Artifact Freshness should be reshaped so it can evaluate artifact state from source context without independently reloading and revalidating the source.
- Expected SVG Artifact derivation remains next-to-source and same-stem for v1.
- Directory-scoped source paths remain normalized relative to Check Scope for provenance comparison.
- Explicit source-file checks keep source display paths relative to the current working directory.
- Provenance construction and provenance shape validation should share one model across rendering and freshness checking.
- Provenance shape validation must reject valid JSON that lacks required fields, has non-string required fields, or lacks renderer name/version strings.
- Malformed provenance shape should become a malformed artifact state, not a thrown exception.
- Missing DiagramPilot provenance remains a missing provenance state.
- Stale provenance remains a stale state with explicit reason names.
- The render SVG adapter should continue to own D2 invocation, worker cleanup, rendering, and SVG metadata insertion.
- The no-timestamp Review-Stable Rendering policy remains required.
- Repo Workflow Check should preserve the aggregate JSON shape already used by `check --json` unless a change is needed to make malformed provenance states explicit.
- Text output should preserve the current concise repair-command style.
- Public CLI command names, argument shapes, and read-only behaviour should not change.
- The `init` support-file templates should be updated to mention `check` as the read-only repo review command once the deepened workflow is in place.
- The test workflow should make the build-before-test requirement explicit wherever tests import compiled workspace output.
- Existing package seams should be used. No new package is needed for this work.
- No existing ADR needs to be reopened. This PRD preserves ADR-0003, ADR-0005, ADR-0006, and ADR-0007.
- Implementation issues should be small vertical slices, starting with provenance shape validation because it fixes the known crash path.

## Testing Decisions

- Good tests should assert external behaviour at module interfaces and command seams, not private helper layout.
- The highest end-to-end seam remains the real CLI executable for smoke tests.
- The highest non-process seam should become the Repo Workflow Check module.
- Command planning tests should verify that CLI planning delegates check behaviour to Repo Workflow Check and still produces the same exit code, stdout, stderr, and no-write result.
- Repo Workflow Check tests should cover no-source scopes, valid fresh sources, invalid sources, missing artifacts, unreadable artifacts, missing provenance, malformed provenance, stale artifacts, and mixed aggregate results.
- Provenance tests should cover valid provenance, valid JSON with missing top-level fields, valid JSON with missing renderer fields, valid JSON with wrong field types, malformed JSON, missing metadata, and non-SVG content.
- SVG Artifact Freshness tests should verify that malformed provenance shape returns a malformed artifact state rather than throwing.
- Tests should prove each discovered source is validated once through the Repo Workflow Check seam when practical, using a test adapter or fake dependency rather than process-spawn assertions.
- CLI smoke tests should continue to cover real `diagrampilot check` execution for current working directory, explicit directory scope, and explicit source file scope.
- Checkout Demo Project tests should continue to prove that `check` is read-only by comparing the committed SVG before and after command execution.
- Public documentation boundary tests should cover `check` as the repo review workflow and should be extended if `init` guidance is updated.
- Test validation commands in future issues should prefer `npm run build && node --test ...` when tests import compiled workspace output.
- Full phase validation should end with `npm test`, a Checkout Demo Project text check, and a Checkout Demo Project JSON check.

## Out of Scope

- Changing DiagramSpec v1.
- Changing Stable ID rules.
- Changing Group or Edge semantics.
- Adding artifact mapping configuration.
- Adding configurable ignore patterns.
- Adding Mermaid, D2, DOT, or PNG freshness checks.
- Adding render comparison or byte comparison to `check`.
- Adding `--fix`, auto-render, or artifact update modes.
- Adding Git root auto-detection.
- Adding multiple Check Scope arguments.
- Adding hosted workspace behaviour.
- Adding MCP implementation.
- Replacing D2 as the SVG render path.
- Changing public documentation hosting paths.
- Hand-editing generated SVG artifacts.
- Splitting the workspace into additional packages solely to move code around.

## Further Notes

Research summary:

- The current Repo Workflow Check implementation validates a discovered
  DiagramPilot Source File in command planning and then calls SVG Artifact
  Freshness checking, which loads and validates the same source again.
- Provenance shape is currently trusted after JSON parsing; valid JSON with a
  missing nested renderer object can throw during stale comparison.
- Provenance construction exists in both core freshness checking and SVG
  rendering, which creates drift risk for source hash and renderer metadata
  semantics.
- The command planning seam is valuable, but the `check` branch has grown into
  a workflow implementation instead of a thin command adapter.
- The current package entry files are over the healthy size threshold, with
  core mixing several domain concepts and CLI mixing argument parsing,
  scaffolding, report shaping, planning, execution, and entrypoint logic.
- Many tests import compiled workspace output. `npm test` builds first, but
  direct issue validation plans should not omit the build step when touching
  compiled modules.
- The top implementation issue number available after current completed work is
  36.

Suggested issue slices:

1. Add robust provenance shape validation and cover malformed valid-JSON metadata.
2. Move SVG Artifact Freshness to operate on validated source context.
3. Add the deep Repo Workflow Check module and move aggregate result construction into it.
4. Thin CLI check planning into an adapter over Repo Workflow Check.
5. Centralize provenance construction across render and freshness checking.
6. Update `init` support-file guidance and validation plans to include `check` and explicit build requirements.
