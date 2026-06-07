Status: ready-for-agent

# v0.3.0 Alpha Capability Release

## Problem Statement

DiagramPilot has reached the first Public Alpha Release shape with a local CLI,
package publishing path, public documentation, a Public Website, and a
repo-native validation/render/export workflow. The next release needs to move
from release readiness into a real feature release without losing the
early-adopter expectations of the alpha line.

The current product is still too narrow for agents working across a repository.
It can validate DiagramPilot Source Files, export Mermaid and D2, render SVG,
and check next-to-source SVG freshness, but it cannot yet produce DOT or PNG,
generate configured outputs across a repo, publish generated Markdown embeds,
or expose structured agent operations through MCP. Repo workflow checks also
cannot express intentional artifact mappings or ignore patterns.

The source-format contract also needs to tighten. YAML is the preferred
Authoring Format for humans and agents, but `*.dp.json` remains supported as a
source format. That split increases documentation, validation, mutation, and
MCP complexity. For the next feature release, DiagramPilot should move to
YAML-only source support while keeping JSON for structured CLI output, schema
helpers, provenance metadata, package manifests, and other tooling surfaces.

Release operations need to improve at the same time. Every implementation issue
that merges to `main` should be a clean Issue Release with its own Issue
Version, npm `latest` publish, Git tag, GitHub Release, and release notes.
The v0.3.0 release should then close out the full PRD-scoped feature set as a
fully functional Alpha Capability Release.

Finally, the documentation needs to be retuned around how DiagramPilot will be
used in v0.3.0: repo-native source files, validation, generated artifacts,
configured repo workflows, MCP, and alpha expectations. This should be a full
Release-Aligned Documentation Rework across public and maintainer docs, with
ADRs checked for continued applicability but not churned.

## Solution

Run one v0.3.0 Alpha Capability Release PRD with multiple feature tracks. Each
implementation issue in this PRD should merge to `main` as its own Issue
Release with an assigned `0.2.x` Issue Version. The `0.3.0` version is reserved
for PRD closeout, proving that the scoped feature set works together and that
docs, packages, release notes, website, and validation are aligned.

The release will:

1. Add GitHub Releases and release notes for every clean public release tag,
   including intermediate `0.2.x` Issue Releases and the `v0.3.0` closeout
   release.
2. Add DOT export as a text Derived Artifact through `diagrampilot export`.
3. Add PNG rendering as rasterized SVG output through `diagrampilot render`.
4. Remove `*.dp.json` as a DiagramPilot Source File format while keeping JSON
   tooling surfaces.
5. Add optional Repo Workflow Configuration with artifact mappings, ignore
   patterns, output templates, generated Markdown embeds, and broader artifact
   freshness checks.
6. Add `diagrampilot generate [path]` as the explicit write command for
   configured repo outputs.
7. Add `@diagrampilot/mcp` as a new public package and ship an alpha MCP server
   with resources, prompts, read tools, repo-output generation, Source Creation,
   and Source Mutation through Structured Diagram Operations.
8. Rework all documentation for v0.3.0 behavior, including public docs,
   `README.md`, `llms.txt`, website copy, package READMEs, and maintainer docs.

## User Stories

1. As a developer adopting DiagramPilot, I want the next release to be a
   cohesive feature release, so that I can understand what v0.3.0 adds beyond
   public alpha packaging.
2. As a release maintainer, I want each implementation issue to merge as an
   Issue Release with its own Issue Version, so that release history maps
   directly to completed work.
3. As a release maintainer, I want `0.3.0` reserved for PRD closeout, so that
   the milestone marks the complete feature set rather than an arbitrary issue.
4. As a release maintainer, I want GitHub Releases for every clean `main`
   release, so that public release history is visible outside npm.
5. As a release maintainer, I want release notes for every GitHub Release, so
   that users can understand what changed in each Issue Release.
6. As a release maintainer, I want release notes derived from issue closeout
   fields, so that public release notes stay connected to implementation notes
   and validation results.
7. As a release maintainer, I want maintainer-reviewed GitHub Release drafts, so
   that generated release-note text is reviewed before publication.
8. As a release maintainer, I want CI to complete before any CD side effect, so
   that tags, package publishes, and GitHub Releases only happen after
   validation.
9. As a release maintainer, I want CD to publish npm `latest` before publishing
   the GitHub Release, so that public release notes point to installable
   packages.
10. As a release maintainer, I want nightly package publishes to avoid GitHub
    Releases, so that the GitHub release page is not cluttered with integration
    artifacts.
11. As a user exporting diagrams, I want DOT export, so that I can interoperate
    with Graphviz workflows.
12. As a user exporting diagrams, I want DOT output on stdout by default, so
    that DOT behaves consistently with Mermaid and D2 export.
13. As a user exporting diagrams, I want `--out` for DOT file writes, so that
    export write intent remains explicit.
14. As a user reviewing DOT output, I want groups represented as Graphviz
    clusters where practical, so that DiagramSpec organization is preserved.
15. As a user rendering diagrams, I want PNG rendering, so that I can use
    raster artifacts in contexts that do not handle SVG well.
16. As a user rendering diagrams, I want `render --format svg|png`, so that SVG
    remains the default and PNG is an obvious extension of rendering.
17. As a maintainer, I want PNG rendered by rasterizing the existing SVG output,
    so that SVG and PNG remain visually aligned.
18. As a maintainer, I want external renderers kept behind adapter seams, so
    that a future Native Rendering Engine can replace the primary render path.
19. As a maintainer, I want to avoid D2-specific DiagramSpec semantics, so that
    DiagramSpec remains renderer-neutral.
20. As an agent authoring diagrams, I want YAML-only source support, so that the
    Authoring Format is clear and mutation behavior is simpler.
21. As a user with old JSON sources, I want repairable diagnostics for
    `*.dp.json` source files, so that I know to convert them to `*.dp.yaml`.
22. As a user with old JSON sources, I want JSON tooling surfaces to remain, so
    that `--json`, schema helpers, provenance metadata, and package manifests
    are not confused with source-file support.
23. As a maintainer, I want no JSON-to-YAML migration command in v0.3.0, so
    that low-usage source compatibility does not add a new product surface.
24. As a public-docs reader, I want JSON source removal called out in release
    notes and docs, so that the compatibility change is visible.
25. As a repo maintainer, I want optional Repo Workflow Configuration, so that I
    can express artifact expectations without losing zero-config behavior.
26. As a repo maintainer, I want `diagrampilot.config.yaml` discovered from the
    command scope upward, so that subdirectory workflows still find repo config.
27. As a repo maintainer, I want config validation before source processing, so
    that malformed config does not silently fall back to defaults.
28. As a repo maintainer, I want explicit source mappings and source globs, so
    that I can configure important diagrams and repo-scale patterns.
29. As a repo maintainer, I want matched config mappings to replace the default
    SVG expectation for that source, so that custom output locations do not
    create duplicate stale checks.
30. As a repo maintainer, I want source ignore patterns, so that vendored or
    generated directories do not become part of repo workflow checks.
31. As a repo maintainer, I want ignore patterns to avoid suppressing configured
    artifact failures, so that expected outputs cannot be hidden accidentally.
32. As a repo maintainer, I want output path templates with fixed variables, so
    that generated artifacts can be organized without a mini language.
33. As a repo maintainer, I want configured paths constrained to the config
    directory tree, so that generation cannot unexpectedly write outside the
    owned repo/subtree boundary.
34. As a repo maintainer, I want `check` to remain read-only, so that CI can
    report workflow issues without writing files.
35. As a repo maintainer, I want `generate` to rewrite expected outputs, so that
    configured artifacts and embeds can be refreshed with one command.
36. As an agent, I want `generate --json`, so that I can inspect structured
    generated-output results and failures.
37. As a docs author, I want generated Markdown embeds, so that diagrams can be
    included in docs as generated artifacts.
38. As a docs author, I want generated Markdown embeds as standalone generated
    files, so that DiagramPilot does not edit arbitrary prose documents.
39. As a docs author, I want Markdown embeds to depend on fresh artifacts, so
    that a clean embed does not hide a stale image.
40. As an AI coding agent, I want an MCP server, so that I can access
    DiagramPilot behavior through structured agent operations.
41. As an MCP user, I want `@diagrampilot/mcp` published with the Public Package
    Set, so that MCP support is version-aligned with the CLI and core packages.
42. As an MCP user, I want `diagrampilot mcp` as the documented launch path, so
    that I can start the server through the main CLI.
43. As an MCP client configurator, I want a dedicated package-level executable,
    so that clients that expect direct commands can launch DiagramPilot MCP.
44. As an MCP user, I want resources for schema, docs, examples, discovered
    sources, and check results, so that I can inspect repository diagram state.
45. As an MCP user, I want read tools for validation, repo workflow checks,
    export, and render, so that I can ask DiagramPilot for current behavior.
46. As an MCP user, I want a side-effecting repo output generation tool, so that
    agents can refresh configured outputs through MCP.
47. As an MCP user, I want explicit file paths or scopes for write tools, so
    that writes do not default to the whole repository.
48. As an MCP user, I want structured before/after summaries and written paths,
    so that I can understand side effects without receiving large full diffs.
49. As an MCP user, I want a small prompt set, so that common DiagramPilot agent
    workflows are discoverable.
50. As an MCP user, I want prompts treated as public behavior with tests, so
    that prompt names and arguments are stable within the release.
51. As an MCP user, I want Source Creation from structured input, so that agents
    can create valid YAML DiagramPilot Source Files.
52. As an MCP user, I want Source Mutation through Structured Diagram
    Operations, so that agents can safely update diagrams without raw YAML file
    replacement.
53. As an MCP user, I want fine-grained object and metadata mutation tools, so
    that agents do not fall back to raw source edits for common changes.
54. As an MCP user, I want mutation tools to validate after each atomic change,
    so that invalid writes are not committed.
55. As an MCP user, I want mutation targets to use Stable IDs, so that labels do
    not become ambiguous identities.
56. As an MCP user, I want Source Creation to require Stable IDs, so that object
    identity remains explicit and reviewable.
57. As an MCP user, I want a read-only Stable ID suggestion helper, so that
    agents can generate valid IDs without writing.
58. As a reviewer, I want canonical YAML key order after rewrites, so that MCP
    mutations produce review-stable source diffs.
59. As a reviewer, I want array order preserved unless a mutation changes it, so
    that source rewrites are not noisy.
60. As a reviewer, I want optional top-level object insertion positioning, so
    that new nodes, edges, and groups can be placed reviewably.
61. As a docs reader, I want public MCP docs once MCP ships, so that I can set
    up the alpha MCP server without internal planning notes.
62. As an agent reading `llms.txt`, I want the public MCP guide linked after MCP
    ships, so that I find the supported integration path.
63. As a website visitor, I want MCP mentioned as a shipped integration, so that
    I can see agent workflows without losing the repo-native product story.
64. As a user upgrading from 0.2 to 0.3, I want a concise upgrade section, so
    that I can understand source-format, command, config, generate, and MCP
    changes quickly.
65. As a maintainer, I want all docs tailored to v0.3.0 behavior, so that
    public and internal docs no longer read like v0.2.0 docs.
66. As a maintainer, I want ADRs checked for continued applicability but not
    generally changed, so that decision history remains stable.

## Implementation Decisions

- v0.3.0 is one Alpha Capability Release PRD with multiple feature tracks.
- Individual implementation issues in the PRD use `0.2.x` Issue Versions.
- `0.3.0` is reserved for final PRD closeout.
- The release remains alpha-line software, not beta or production-ready.
- PRD issue slicing should be backed by primary-source research and local
  code-seam scoring.
- Feature scoring separates upside from cost: impact is `1-5` where higher is
  better; implementation risk, dependency risk, public contract risk, and docs
  burden are `1-5` where lower is better; confidence is `low`, `medium`, or
  `high`.
- Every clean `main` Issue Release gets a GitHub Release and release notes.
- Nightly branch publishes do not get GitHub Releases.
- GitHub Release notes are derived from local issue closeout fields.
- Release-note text is generated by a checked-in script and reviewed in the
  GitHub Release draft body.
- Release-note drafts do not live in `.scratch/` or committed files.
- The release workflow fails before GitHub Release publication if the reviewed
  GitHub Release draft is missing, empty, or mismatched with the package
  version/tag.
- CI must pass before any CD side effect.
- CD publishes npm `latest`, creates the `vX.Y.Z` tag from the reviewed `main`
  commit, and then publishes the GitHub Release.
- GitHub Release publication only happens after npm `latest` succeeds for the
  same version.
- DOT is added as `diagrampilot export <path> --format dot`.
- DOT export keeps stdout-by-default behavior and writes only with `--out`.
- DOT export uses `digraph` by default.
- DOT export encodes undirected DiagramSpec edges with `dir=none`.
- DOT export maps groups to Graphviz clusters where practical.
- PNG is added through `diagrampilot render <path> --format svg|png --out
  <path>`.
- `render --format` defaults to `svg` so existing render commands keep working.
- PNG rendering rasterizes SVG output from the current local render path.
- v0.3.0 should avoid D2-specific layout semantics beyond what is needed for
  SVG/PNG output and interop.
- External renderers and exporters remain behind adapter seams for future
  Native Rendering Engine work.
- DOT is an exported artifact.
- PNG is a rendered artifact.
- DiagramSpec source files remain numeric `version: 1` in v0.3.0.
- Do not use fractional source versions such as `1.1`.
- Do not add new DiagramSpec fields unless PRD research proves a field is
  required.
- Remove `*.dp.json` as a DiagramPilot Source File format in v0.3.0.
- Keep JSON for structured CLI output, DiagramSpec JSON Schema, SVG provenance,
  package manifests, and other tooling surfaces.
- `*.dp.json` inputs produce repairable diagnostics in v0.3.0.
- Do not add a JSON-to-YAML migration command in v0.3.0.
- Mention JSON source removal prominently in v0.3.0 release notes and public
  docs, without a large migration guide.
- v0.4.0 should stop repo workflow discovery from treating `*.dp.json` as a
  source format while preserving explicit unsupported-source diagnostics for
  direct `*.dp.json` command inputs.
- Repo Workflow Configuration is optional and expected at
  `diagrampilot.config.yaml`.
- `diagrampilot init` does not create config by default.
- `diagrampilot init --config` creates a minimal valid config without scanning
  the repository or inferring mappings.
- `diagrampilot init --config` fails with repair guidance if config already
  exists; overwriting requires a later `--force` decision.
- Config discovery searches upward from command scope to Git root or filesystem
  root and uses the first config found.
- Structured `--json` output includes the config path used.
- Repo Workflow Configuration requires top-level `version: 1`.
- Config validation happens before source processing in `check` and `generate`.
- Invalid config returns repairable diagnostics naming the config path and
  invalid field.
- Zero-config remains supported: `docs/foo.dp.yaml` expects `docs/foo.svg`.
- Artifact mappings support explicit `source` entries and `sourceGlob` entries.
- Each artifact mapping entry uses exactly one mapping mode.
- Configured output formats are limited to `svg`, `png`, `mermaid`, `d2`,
  `dot`, and `markdown` in v0.3.0.
- A matched artifact mapping replaces the zero-config expected SVG artifact for
  that source.
- Unmatched sources keep the zero-config SVG expectation.
- Output path templates support `{stem}`, `{sourceDir}`, `{sourcePath}`, and
  `{format}`.
- Path templates are not a general expression language.
- Ignore patterns apply to source discovery only in v0.3.0.
- Ignore patterns do not suppress missing or stale configured artifact
  expectations for sources that remain in scope.
- Ignore patterns use gitignore-style globs relative to the config directory.
- Absolute ignore paths are invalid.
- Configured output paths, `source` paths, and `sourceGlob` paths must stay
  within the config directory tree in v0.3.0.
- Cross-boundary outputs require a later explicit escape-hatch decision.
- `check` remains read-only.
- Text exported artifact freshness for Mermaid, D2, and DOT uses content
  comparison.
- SVG freshness continues to use provenance metadata.
- PNG freshness uses readable provenance metadata when feasible. If stable PNG
  metadata cannot be embedded and read locally in v0.3.0, `check` verifies
  configured PNG presence and defers PNG byte-compare freshness.
- Add `diagrampilot generate [path]` as the explicit repo workflow write
  command.
- Without config, `generate` refreshes the zero-config expected SVG artifact.
- `generate` rewrites all expected outputs for the selected scope by default.
- `generate` does not require an additional `--write` flag.
- `generate` prints concise text output and supports structured `--json`
  output.
- `generate` creates parent directories for expected output paths.
- Generated Markdown embeds are standalone generated files.
- DiagramPilot does not edit arbitrary existing docs to insert embeds in
  v0.3.0.
- Markdown embed generation depends on the referenced artifact expectation.
- Add `@diagrampilot/mcp` as a new public package in the Public Package Set.
- Once introduced, `@diagrampilot/mcp` participates in every version bump,
  package readiness check, publish-state check, release workflow package list,
  and npm publish.
- `@diagrampilot/mcp` publishes through the same `latest` flow as the rest of
  the Public Package Set.
- MCP alpha status is documented, not modeled with a separate package dist-tag.
- MCP launches through `diagrampilot mcp` and a dedicated package-level
  executable.
- `diagrampilot mcp` is the documented user-facing path.
- The MCP implementation issue must include maintainer setup instructions for
  package publishing, package readiness, release workflow package lists, MCP
  client configuration, and local smoke validation.
- MCP resources include schema, docs, examples, discovered sources, and check
  results.
- MCP read tools include validation, repo workflow checks, export, and render.
- MCP exposes Repo Workflow Configuration validation.
- MCP exposes a side-effecting write tool for repo output generation that wraps
  the same core behavior as `diagrampilot generate`.
- MCP write tools require explicit file paths or scope and do not default to
  whole-repo writes.
- MCP write tools return structured before/after summaries and written paths,
  not full diff output in v0.3.0.
- MCP includes a small documented prompt set for creating or updating a
  DiagramPilot Source File from repo context, repairing validation errors, and
  refreshing configured artifacts.
- Shipped MCP prompts are public behavior with tests for names, arguments, and
  workflow coverage.
- MCP Source Creation and Source Mutation operate through Structured Diagram
  Operations.
- MCP Source Mutation is not free-form YAML replacement.
- MCP mutation tools include fine-grained operations for nodes, edges, groups,
  top-level title, top-level description, top-level direction, top-level
  metadata keys, and object metadata keys.
- MCP mutation tool calls are atomic.
- MCP validates after mutation, does not commit invalid writes, and returns
  repairable diagnostics for failed attempts.
- MCP object mutation targets use Stable IDs only.
- Labels may be returned for context but are not mutation identity.
- MCP Source Creation requires caller-provided Stable IDs.
- MCP includes a read-only helper that suggests Stable IDs from labels and
  reports collisions when source context is provided.
- MCP writes YAML from Source Creation and Source Mutation.
- MCP mutates existing valid YAML source files only.
- Invalid existing source files are diagnostic targets before mutation.
- Rewritten YAML uses canonical key ordering for review stability.
- Rewritten YAML preserves `nodes`, `edges`, `groups`, and `contains` array
  order unless a mutation explicitly changes it.
- New objects append by default unless a supported positioning option is used.
- v0.3.0 supports `beforeId` and `afterId` positioning for top-level node, edge,
  and group insertion.
- v0.3.0 does not support `contains` positioning; group containment entries
  append by default.
- Source comment preservation is not promised until the rewrite model can prove
  it.
- Public MCP docs ship in v0.3.0 and label MCP as alpha.
- `llms.txt` links the public MCP guide once MCP ships.
- The Public Website mentions MCP as a shipped agent integration path while
  keeping the primary product story centered on repo-native source files,
  validation, artifacts, and repo workflow.
- Add a concise public `0.2 -> 0.3` upgrade section.
- Rework all docs for v0.3.0 behavior and terminology.
- Public docs, `README.md`, `llms.txt`, website copy, package READMEs, and
  maintainer docs are in scope for the Release-Aligned Documentation Rework.
- ADRs are checked for continued applicability, but are not generally changed
  unless a new ADR-worthy decision needs to be recorded.

## Testing Decisions

- Tests should cover external behavior through the highest stable seam, not
  implementation details.
- CLI behavior should continue to use command planning tests for argument
  parsing, command results, write intents, text output, and JSON output.
- Executable smoke tests should cover representative installed CLI workflows.
- DOT export tests should verify CLI behavior and package export behavior using
  representative nodes, edges, labels, directed edges, undirected edges, groups,
  nested groups where supported, escaping, stdout output, and `--out` writes.
- PNG rendering tests should verify `render --format png`, default SVG behavior,
  write intent, render failure handling, local conversion behavior, and
  provenance or presence behavior selected for v0.3.0.
- YAML-only source tests should verify `*.dp.yaml` still works, `*.dp.json`
  inputs return repairable unsupported-source diagnostics, and JSON CLI output,
  schema helpers, package manifests, and provenance metadata still work.
- Repo Workflow Configuration tests should verify discovery, zero-config
  fallback, config path reporting in `--json`, version validation, malformed
  config diagnostics, path-boundary checks, mapping semantics, source glob
  behavior, ignore behavior, and output template variables.
- `check` tests should verify read-only behavior with and without config,
  artifact mapping replacement semantics, text artifact content-comparison
  freshness, configured PNG presence or provenance checks, and Markdown embed
  freshness.
- `generate` tests should verify write behavior, parent directory creation,
  selected-scope behavior, rewriting all expected outputs, text output,
  structured `--json`, path-boundary refusal, and failure diagnostics.
- Markdown embed tests should verify generated file content, artifact
  references, freshness dependency, and that existing docs are not edited.
- Release workflow tests should verify CI-before-CD ordering, npm-before-GitHub
  Release ordering, tag creation from the reviewed `main` commit, no GitHub
  Release for nightly publishes, GitHub Release draft validation, release-note
  generation from issue closeout fields, and package/tag/version consistency.
- Package readiness tests should include `@diagrampilot/mcp` once it lands.
- Release version tests should include `@diagrampilot/mcp` in version bumps,
  exact internal dependencies, lockfile metadata, package readiness, and
  publish-state checks once it lands.
- MCP package tests should cover resources, read tools, write tools, prompts,
  server launch, stdio/local server behavior, structured summaries, explicit
  scope requirements, diagnostics, and package-level executable behavior.
- MCP Source Creation tests should verify YAML output, caller-provided Stable
  IDs, validation, canonical key ordering, and no generated identity from
  labels.
- MCP Source Mutation tests should verify atomic writes, validation rollback,
  Stable ID targeting, fine-grained metadata operations, canonical key order,
  array order preservation, top-level insertion positioning, and no `contains`
  positioning.
- Public documentation tests should verify the MCP guide is public only after
  MCP ships, `llms.txt` links it, the website mentions MCP as shipped behavior,
  JSON source removal is prominent, the `0.2 -> 0.3` upgrade section is present,
  and public docs avoid internal planning language.
- Maintainer documentation checks should verify roadmap, architecture, release
  workflow, documentation contract, package publishing, and relevant package
  README docs align with v0.3.0.
- ADR review should verify existing ADRs still apply or explicitly record why a
  new ADR is needed for any hard-to-reverse, surprising, trade-off-based
  decision.
- Visual website checks should run for website changes, but GitHub-hosted
  release automation should avoid runner-specific visual cache churn unless the
  visual-check strategy changes.

## Out Of Scope

- Production-ready v1.0 semantics.
- Beta positioning.
- Hosted diagram workspace.
- Prompt-only diagram generation.
- Visual editor or drag-and-drop canvas.
- User accounts, login, billing, hosted project storage, or collaboration.
- Project analyzers.
- Cloud/provider icon catalogs.
- Arbitrary per-object styling.
- Major layout engine overhaul.
- Native Rendering Engine implementation.
- Removing external export interop.
- New DiagramSpec fields unless PRD research proves one is required.
- Fractional DiagramSpec source versions such as `version: 1.1`.
- JSON-to-YAML migration command.
- In-place edits to arbitrary existing Markdown docs for generated embeds.
- Full diff output from MCP write tools.
- Multi-step MCP mutation transactions.
- Source comment preservation guarantees.
- `contains` insertion positioning in MCP mutation tools.
- `diagrampilot init --config --force`.
- Configured paths outside the Repo Workflow Configuration directory tree.
- GitHub Releases for nightly package publishes.
- GitHub Packages distribution.
- Separate MCP npm dist-tag.
- Watch mode, unless it is explicitly pulled in as stretch scope after the
  mandatory release scope is healthy.
- Large public migration guide beyond a concise `0.2 -> 0.3` upgrade section.

## Further Notes

Primary-source research used during planning:

- Graphviz DOT language documentation for DOT graph, edge, subgraph, and cluster
  semantics.
- D2 export documentation for current SVG/PNG export behavior and render
  expectations.
- Sharp output documentation for local SVG-to-PNG conversion considerations.
- Model Context Protocol server concepts, SDK documentation, and TypeScript SDK
  documentation for resources, tools, prompts, and stdio/local server behavior.
- The `yaml` package documentation for AST mutation and comment/key-order
  considerations.

First-pass scorecard:

| Track | Impact | Impl Risk | Dep Risk | Contract Risk | Docs Burden | Confidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Release operations | 3 | 2 | 2 | 2 | 3 | high |
| DOT export | 3 | 1 | 1 | 2 | 2 | high |
| PNG rendering | 4 | 3 | 3 | 3 | 3 | medium |
| YAML-only source | 4 | 3 | 1 | 5 | 4 | high |
| Artifact mappings, ignores, and generate | 5 | 4 | 1 | 4 | 4 | medium |
| DOT/PNG freshness checks | 4 | 4 | 2 | 4 | 4 | medium |
| Markdown embeds | 4 | 3 | 1 | 3 | 4 | medium |
| MCP resources and read tools | 5 | 3 | 2 | 3 | 4 | medium |
| MCP Source Creation | 5 | 3 | 2 | 4 | 4 | medium |
| MCP Source Mutation | 5 | 5 | 2 | 5 | 5 | medium |
| Full docs rework | 5 | 3 | 1 | 3 | 5 | high |
| Watch mode stretch | 3 | 4 | 1 | 3 | 3 | medium |

Candidate Issue Release sequence for later slicing:

1. `0.2.1` - Release operations foundation and GitHub Release workflow.
2. `0.2.2` - DOT export.
3. `0.2.3` - PNG rendering.
4. `0.2.4` - YAML-only source support and JSON-source diagnostics.
5. `0.2.5` - Repo Workflow Configuration with artifact mappings, ignores, and
   `generate`.
6. `0.2.6` - DOT/PNG freshness checks.
7. `0.2.7` - Generated Markdown embeds.
8. `0.2.8` - MCP package, resources, read tools, prompts, and launch setup.
9. `0.2.9` - MCP Source Creation.
10. `0.2.10` - MCP Source Mutation.
11. `0.3.0` - Release-Aligned Documentation Rework and PRD closeout.

Validation plan for this PRD:

```bash
test -f .scratch/v0-3-0-alpha-capability-release/PRD.md
rg -n "v0.3.0 Alpha Capability Release|Repo Workflow Configuration|MCP Source Mutation|YAML-only" CONTEXT.md docs/development/roadmap.md .scratch/v0-3-0-alpha-capability-release/PRD.md
node --test --test-concurrency=1 test/docs-public-boundary.test.mjs
git diff --check
```
