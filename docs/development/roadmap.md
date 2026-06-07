# Development Roadmap

DiagramPilot is a local-first compiler and validation engine for repo-native
diagrams authored by AI coding agents.

This roadmap is a direction document. Completed tracks are recorded at the end;
active planning should focus on the next release train and the next PRD.

## Current Position

DiagramPilot is closing the `0.2.0` Public Alpha Release. The implemented
product surface is a local TypeScript workspace with these CLI workflows:

- `diagrampilot init`
- `diagrampilot check [path]`
- `diagrampilot check [path] --json`
- `diagrampilot validate <path>`
- `diagrampilot validate <path> --json`
- `diagrampilot render <path> --out <artifact.svg>`
- `diagrampilot render <path> --format svg|png --out <path>`
- `diagrampilot export <path> --format mermaid`
- `diagrampilot export <path> --format d2`
- `diagrampilot export <path> --format dot`
- `diagrampilot export <path> --format mermaid|d2|dot --out <path>`

The current implementation includes:

- DiagramSpec v1 source loading from YAML DiagramPilot Source Files.
- Repairable unsupported-source diagnostics for explicit legacy `*.dp.json`
  source inputs.
- Validated DiagramSpec loading through a shared core lifecycle.
- Repairable text and JSON validation errors.
- Stable lowercase snake case IDs across nodes, edges, and groups.
- Node, Edge, Group, Metadata, Source Reference, External Reference, and Icon
  Reference validation.
- Reusable DiagramSpec topology for group roots, group parentage, containment,
  traversal order, and node paths.
- Mermaid, D2, and DOT text export.
- SVG rendering through the included local D2 path.
- PNG rendering by rasterizing the SVG output from the included local render
  path.
- Packaged `lucide:*` Icon Reference validation.
- Deterministic SVG provenance metadata without wall-clock timestamps.
- Read-only Repo Workflow Check for source discovery, validation, and expected
  SVG artifact freshness through provenance metadata.
- CLI command planning for validating command behavior without spawning the
  executable for every rule.

## Current Contract

These behaviors are the `0.2.0` product contract unless a future PRD explicitly
changes them:

- DiagramSpec remains the source of truth.
- DiagramPilot Source Files are `*.dp.yaml`.
- `*.dp.json` is not a source format; explicit legacy JSON source inputs
  produce repairable diagnostics that point to `*.dp.yaml`.
- Derived Artifact categories include SVG, Mermaid, D2, DOT, and PNG; current
  commands implement SVG, PNG, Mermaid, D2, and DOT.
- `validate` validates explicit source file paths only.
- `validate` does not scan the repository.
- `validate` does not check generated artifact freshness by default.
- `check` is the read-only repo review and CI command.
- `check [path]` discovers DiagramPilot Source Files in the current directory,
  one explicit directory, or one explicit source file.
- `check` validates discovered source files through the shared validated
  DiagramSpec loading path.
- `check` discovers optional Repo Workflow Configuration upward from the
  command scope to the Git root or filesystem root.
- `check` validates Repo Workflow Configuration before source processing and
  applies `sources.ignore` patterns only to source discovery.
- `check` verifies next-to-source same-stem expected SVG artifacts through
  provenance metadata only.
- `check --json` emits aggregate structured repo workflow results to stdout,
  including the config path when config is used.
- `check` does not render, write files, update artifacts, rewrite sources, scan
  from the Git root by default, check Mermaid/D2/DOT/PNG freshness, or support
  configurable artifact mappings.
- `render` defaults to SVG.
- `render --format svg|png` supports SVG and PNG output.
- `render` requires `--out`.
- `export` supports Mermaid, D2, and DOT.
- `export` prints to stdout by default.
- `export` writes a file only when `--out` is provided.
- `init` does not write by default. `init --docs` creates or updates managed
  local agent docs, and `init --config` creates a minimal
  `diagrampilot.config.yaml`.
- `init` does not scan the codebase or generate diagrams.
- Generated SVG provenance records source path, source SHA-256 hash,
  DiagramPilot version, renderer name, and renderer version.
- Generated SVG provenance must not include wall-clock timestamps.
- Core workflows must remain local and must not depend on a hosted workspace.

## Release Train

Each implementation issue that merges to `main` should produce an Issue Release
with its assigned Issue Version. PRD-scoped milestones use intermediate Issue
Releases for individual issue merges and reserve the milestone version for the
final PRD closeout.

For the v0.3.0 Alpha Capability Release:

- The v0.3.0 PRD defines the complete feature scope.
- Each implementation issue in that PRD should merge to `main` as an Issue
  Release with a `0.2.x` Issue Version.
- `0.3.0` is reserved for the final closeout release where the scoped feature
  set is fully functional for the alpha release line.
- The PRD must be backed by primary-source research and local code-seam scoring
  before issue slicing begins.
- Feature scoring separates upside from cost: user impact is scored `1-5`
  where higher is better; implementation risk, dependency risk, public contract
  risk, and documentation burden are scored `1-5` where lower is better.
- Confidence is recorded as `low`, `medium`, or `high`.

Issue Version bumping and closeout are documented in
`docs/development/release-version-workflow.md`.

## Next Milestone: v0.3.0

v0.3.0 should be the next Alpha Capability Release. It is a feature release,
not a release-operations-only milestone. Release operations are part of the
scope because each feature release needs public visibility, release notes, and
repeatable publishing.

### Mandatory Scope

**Release Operations**

- Create a GitHub Release for each clean public release tag, including
  intermediate `0.2.x` Issue Releases and the `v0.3.0` milestone closeout
  release.
- Do not create GitHub Releases for `nightly` branch publishes; nightly builds
  remain npm `nightly` dist-tag integration artifacts.
- Publish release notes for each GitHub Release, including intermediate Issue
  Releases and milestone closeout releases. Release notes should link the npm
  package version, the Public Website, and relevant Public Documentation when
  those links apply.
- Derive GitHub Release notes from local issue closeout fields, including issue
  title, Issue Version, summary, implementation notes, validation results,
  user-facing docs links, known limitations, and follow-up where present.
- Generate release-note text with a checked-in script, then require maintainer
  review in the GitHub Release draft body before publishing.
- The release workflow should fail before GitHub Release publication when the
  reviewed GitHub Release draft for the Issue Version is missing, empty, or
  does not match the package version/tag.
- Keep npm package publishing on the public npm registry.
- Keep GitHub Packages out of scope unless a later distribution decision adds
  it explicitly.
- Make GitHub Release publication a guarded release workflow step that runs
  only after the npm `latest` publish succeeds for the same version.
- CI validation must complete before any CD side effect, including package
  publishing, tag creation, or GitHub Release publication.
- After CI passes on the reviewed `main` commit, CD should verify the Issue
  Version and reviewed GitHub Release draft, publish npm `latest`, create the
  `vX.Y.Z` tag for that commit, and then publish the GitHub Release.

**Export And Rendering**

- DOT export is complete: `diagrampilot export <path> --format dot` preserves
  stdout-by-default behavior, writes files only with `--out`, uses `digraph`,
  encodes undirected DiagramSpec edges with `dir=none`, and maps groups to
  Graphviz clusters where practical.
- PNG rendering is complete: `diagrampilot render <path> --format png --out
  <path>` rasterizes the SVG produced by the existing local render path rather
  than introducing a second layout or rendering engine.
- Keep external renderer/export dependencies behind adapter seams so future
  Native Rendering Engine work can replace the primary render path without
  removing export interop.
- Avoid adding D2-specific layout semantics beyond what is needed for SVG/PNG
  output and interop. DiagramSpec should remain renderer-neutral.
- Keep DOT as an exported artifact, not a DiagramPilot Source File.
- Keep PNG as a rendered artifact, not an editable source.

**YAML-Only Source Support**

- Remove `*.dp.json` as a DiagramPilot Source File format in v0.3.0.
- Keep DiagramSpec source files at numeric `version: 1` in v0.3.0 unless an
  incompatible DiagramSpec source contract requires `version: 2`; do not use
  fractional source versions such as `1.1`.
- Do not add new DiagramSpec fields in v0.3.0 unless PRD research proves a
  field is required for the scoped release.
- Keep JSON for structured CLI output, the DiagramSpec JSON Schema helper, SVG
  provenance metadata, package manifests, and other tooling surfaces.
- `*.dp.json` source files produce repairable diagnostics that explain JSON
  source files are no longer supported and should be converted to
  `*.dp.yaml`.
- Do not add a JSON-to-YAML migration command in v0.3.0; current expected usage
  does not justify a dedicated migration surface.
- Mention JSON source removal prominently in v0.3.0 release notes and public
  docs, but do not create a large migration guide.
- Repo workflow discovery ignores `*.dp.json` files when scanning directories.
- Explicit commands such as `diagrampilot validate docs/old.dp.json` return a
  repairable unsupported-source-format diagnostic instead of silently doing
  nothing.

**Repo Workflow Deepening**

- Introduce optional Repo Workflow Configuration, expected as
  `diagrampilot.config.yaml`.
- `diagrampilot init` should not create Repo Workflow Configuration by default.
- Add `diagrampilot init --config` to create a minimal valid
  `diagrampilot.config.yaml` without scanning the repository or inferring
  mappings.
- `diagrampilot init --config` should fail with a repairable message when the
  config already exists. Updating or overwriting existing config requires a
  later explicit `--force` decision.
- Discover Repo Workflow Configuration by searching upward from the command
  scope until the Git root or filesystem root, using the first config found.
- Include the config path used in structured `--json` output.
- Require top-level `version: 1` for the first Repo Workflow Configuration
  schema.
- Validate Repo Workflow Configuration before source processing in `check` and
  `generate`. Invalid config should fail with repairable diagnostics that name
  the config path and invalid field.
- Keep the zero-config default: `docs/foo.dp.yaml` expects `docs/foo.svg`.
- Add configurable artifact mappings with explicit `source` entries and
  `sourceGlob` entries. Each mapping entry must use exactly one mapping mode.
- Limit configured output formats to known Derived Artifact formats for v0.3.0:
  `svg`, `png`, `mermaid`, `d2`, `dot`, and `markdown`.
- A matching artifact mapping replaces the zero-config expected SVG artifact
  for that source. Unmatched sources keep the zero-config SVG expectation.
- Output path templates support a small fixed variable set for v0.3.0:
  `{stem}`, `{sourceDir}`, `{sourcePath}`, and `{format}`. Templates should not
  become a general expression language.
- Add configurable ignore patterns.
- In v0.3.0, ignore patterns apply to source discovery only. They should not
  suppress missing or stale configured artifact expectations for sources that
  remain in scope.
- Ignore patterns use gitignore-style globs relative to the Repo Workflow
  Configuration file directory. Absolute ignore paths are invalid.
- Add broader DOT/PNG artifact freshness checks where practical.
- PNG freshness should use readable provenance metadata when feasible. If
  stable PNG metadata cannot be embedded and read locally in v0.3.0, `check`
  should verify configured PNG presence and defer PNG byte-compare freshness.
- Keep `check` read-only. Even with Repo Workflow Configuration, embeds, and
  broader artifact checks, `check` reports missing or stale outputs and does
  not generate files.
- Add `diagrampilot generate [path]` as the explicit repo workflow command that
  renders or exports configured artifacts and generated embeds. Without config,
  `generate` should refresh the zero-config expected SVG artifact.
- `generate` should rewrite all expected outputs for the selected scope by
  default, not only outputs currently detected as stale or missing.
- The `generate` command name is sufficient write intent; do not require an
  additional `--write` flag. It should print a concise count or list of written
  outputs.
- Support `diagrampilot generate [path] --json` with structured scope, config,
  source, output, written path, and failure details for agents and CI.
- `generate` should create parent directories for expected output paths, while
  refusing writes outside the selected repo/config boundary unless a later
  explicit decision allows them.
- Configured output paths must stay within the Repo Workflow Configuration
  directory tree in v0.3.0. Cross-boundary outputs need a later explicit
  escape-hatch decision.
- Configured `source` and `sourceGlob` paths must also stay within the Repo
  Workflow Configuration directory tree.
- Add generated Markdown embeds.
- Generated Markdown embeds are standalone generated files, not in-place edits
  to existing documentation files.
- Markdown embed generation depends on the referenced artifact expectation. A
  generated embed should not be treated as fresh when it points at a stale or
  missing artifact.

**MCP And Structured Agent Operations**

- Add `@diagrampilot/mcp` as a new public package in the v0.3.0 Public Package
  Set.
- Once `@diagrampilot/mcp` lands, include it in every Public Package Set
  version bump, package readiness check, publish-state check, release workflow
  package list, and npm publish.
- Publish `@diagrampilot/mcp` through the same `latest` flow as the rest of the
  Public Package Set. Document the MCP server as alpha rather than using a
  separate MCP dist-tag.
- Add an alpha MCP server.
- Support launching MCP through `diagrampilot mcp` and a dedicated package-level
  executable, with `diagrampilot mcp` as the documented user-facing path.
- The MCP implementation issue should include maintainer setup instructions for
  package publishing, package readiness, release workflow package lists, MCP
  client configuration, and local smoke validation.
- Add resources for schema, docs, examples, discovered sources, and check
  results.
- Add a small documented MCP prompt set for creating or updating a DiagramPilot
  Source File from repo context, repairing validation errors, and refreshing
  configured artifacts after source changes.
- Treat shipped MCP prompts as public behavior with tests for prompt names,
  arguments, and intended workflow coverage.
- Add read tools for validation, repo workflow checks, export, and render.
- Add MCP access to Repo Workflow Configuration validation with the same
  repairable diagnostics as CLI `check` and `generate`.
- Add a side-effecting MCP write tool for repo output generation that wraps the
  same core behavior as `diagrampilot generate`.
- Require explicit file paths or scope for MCP write tools. Source mutation and
  repo output generation should not default to whole-repo writes.
- MCP write tools should return structured before/after summaries and written
  paths in v0.3.0, not full diff output.
- Add a read-only helper that suggests Stable IDs from labels and reports
  collisions when source context is provided.
- Add Source Creation through Structured Diagram Operations.
- Add Source Mutation through Structured Diagram Operations rather than
  free-form source replacement.
- Include fine-grained mutation operations for nodes, edges, groups, top-level
  title/description/direction, top-level metadata keys, and object metadata
  keys.
- Treat each MCP mutation tool call as atomic. Validate after mutation, do not
  commit invalid writes, and return repairable diagnostics for failed mutation
  attempts.
- Target MCP object mutations by Stable ID. Labels can be returned for context
  but must not be used as mutation identity.
- Require caller-provided Stable IDs during MCP Source Creation; do not generate
  object identities from labels in v0.3.0.
- Write YAML from MCP Source Creation and Source Mutation.
- Mutate existing valid YAML source files only.
- Treat invalid existing source files as diagnostic targets before mutation
  rather than attempting to patch semantically invalid input.
- Preserve existing object order and unknown metadata where practical.
- Rewritten YAML should use canonical key order for review stability:
  top-level `version`, `title`, `description`, `direction`, `nodes`, `edges`,
  `groups`, `metadata`; node `id`, `label`, `description`, `kind`, `icon`,
  `metadata`; edge `id`, `from`, `to`, `label`, `directed`, `metadata`; group
  `id`, `label`, `description`, `contains`, `metadata`.
- Preserve array order for `nodes`, `edges`, `groups`, and `contains` unless a
  mutation explicitly inserts, removes, or reorders entries. New objects append
  by default unless a positioning option is provided.
- Support `beforeId` and `afterId` positioning for top-level node, edge, and
  group insertion in v0.3.0. Keep `contains` positioning out of scope; append
  group containment entries by default.
- Do not promise source comment preservation until the source rewrite model can
  prove it.

**Release-Aligned Documentation Rework**

- Rework all docs so they describe v0.3.0 behavior and terminology.
- Public docs, `README.md`, `llms.txt`, website copy, package READMEs, and
  maintainer docs are in scope.
- Publish public MCP docs in v0.3.0, with the MCP server clearly labeled as
  alpha.
- Update `llms.txt` to link the public MCP guide once MCP ships.
- Update the Public Website to mention MCP as a shipped agent integration path,
  while keeping the primary product story centered on repo-native source files,
  validation, artifacts, and repo workflow.
- Add a concise public upgrade section for `0.2 -> 0.3` covering JSON source
  removal, `render --format`, `export --format dot`, optional config,
  `generate`, MCP alpha setup, and release notes.
- ADRs should be checked for continued applicability.
- ADRs should generally not be changed unless a new ADR-worthy decision needs
  to be recorded.

### Stretch Scope

- Watch mode for local authoring loops.

Watch mode is useful, but it has cross-platform filesystem, process
orchestration, debounce, and terminal UX risk. It should not block v0.3.0
closeout.

### Out Of Scope For v0.3.0

- Project analyzers.
- Cloud/provider icon catalogs.
- Arbitrary per-object styling.
- Major layout engine overhaul.
- Hosted workspace dependency.
- Visual editor or drag-and-drop canvas.
- Prompt-only SaaS generation.

### First-Pass Scorecard

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

### Candidate Issue Release Sequence

The v0.3.0 PRD should confirm or revise this sequence:

1. `0.2.1` - Release operations foundation and GitHub Release workflow.
2. `0.2.2` - DOT export.
3. `0.2.3` - PNG rendering.
4. `0.2.4` - YAML-only source support and JSON-source diagnostics.
5. `0.2.5` - Repo Workflow Configuration with artifact mappings, ignores, and
   `generate`.
6. `0.2.6` - DOT/PNG freshness checks.
7. `0.2.7` - Generated Markdown embeds.
8. `0.2.8` - MCP resources and read tools.
9. `0.2.9` - MCP Source Creation.
10. `0.2.10` - MCP Source Mutation.
11. `0.3.0` - Release-Aligned Documentation Rework and PRD closeout.

## After v0.3.0

### v0.4.0 Direction

- Revisit watch mode if it did not ship in v0.3.0.

### Later Product Backlog

These are intentionally after the v0.3.0 PRD unless that PRD changes them:

- Project analyzers: package dependency graphs, OpenAPI flows, database schema
  diagrams, infrastructure summaries, and monorepo package maps.
- Cloud/provider icon namespaces after packaging and licensing are clear.
- Stronger layout configuration beyond top-level `direction`.
- Dedicated layout package evaluation when renderer defaults are not enough.
- Native Rendering Engine work that makes DiagramPilot's own renderer the
  primary render path while preserving external export targets where useful.
- Larger specialized diagram-type catalogs.

## Completed History

The completed history is useful context, but it is not the active backlog.

### MVP

The MVP issue slices under `.scratch/diagrampilot-mvp/` are complete. The MVP
established DiagramSpec v1 validation, Mermaid/D2 export, SVG rendering, local
CLI workflows, repairable diagnostics, and review-stable provenance.

### Architecture Deepening

The architecture-deepening tracker under `.scratch/architecture-deepening/` is
complete. Treat these as current architecture:

- Validated DiagramSpec loading.
- Shared validation loading in `export` and `render`.
- Centralized Repairable Validation Error diagnostics.
- DiagramSpec topology.
- Group containment validation through topology where useful.
- Isolated SVG provenance construction and insertion.
- CLI command planning with filesystem work at execution edges.

### Release Readiness

Release readiness is complete. An AI coding agent can start at
`https://diagrampilot.com/llms.txt`, follow only Public Documentation, inspect
the Checkout Demo Project, validate its DiagramPilot Source File, render its
SVG Derived Artifact, and repeat the workflow in another repository.

Maintainers can verify the public/internal docs split and demo workflow with:

```bash
node --test test/docs-public-boundary.test.mjs
node --test test/checkout-demo-project.test.mjs
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js validate docs/architecture.dp.yaml)
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js render docs/architecture.dp.yaml --out docs/architecture.svg)
git diff --exit-code demo-projects/checkout/docs/architecture.svg
npm test
```

### Public Website Publication

The Public Website Publication track under
`.scratch/public-website-publication/` is complete. It split public and
internal docs, added the DiagramSpec v1 JSON Schema artifact, published
`docs-public/` through website routes, built the public landing page, and added
deployment guidance.

### Productization And Maintainability

The Productization And Maintainability track under
`.scratch/productization-and-maintainability/` is complete. It cleaned the
current-state public surface, added the maintainability file-size gate, split
large modules, formalized the Documentation Contract, redesigned the landing
page, and added website visual quality checks.

### Repo Workflow Check

Repo Workflow Check is complete. The implementation is recorded in
`.scratch/repo-workflow-check/` and deepened in
`.scratch/repo-workflow-check-deepening/`.

The shipped `diagrampilot check [path] [--json]` command:

1. Discovers DiagramPilot Source Files from the current directory, one explicit
   directory, or one explicit source file.
2. Validates discovered source files through the shared validated DiagramSpec
   loading path.
3. Derives the next-to-source same-stem Expected SVG Artifact for each valid
   source.
4. Checks SVG Artifact freshness by reading DiagramPilot provenance metadata.
5. Emits concise text output and aggregate JSON output.

The first `check` command does not render, write files, update artifacts,
rewrite sources, scan from the Git root by default, check Mermaid/D2/DOT/PNG
freshness, or use configurable artifact mappings.

### Public Alpha Release

The Public Alpha Release track under `.scratch/public-alpha-release/` prepares
`0.2.0` as the first public and published alpha release. Its implementation
issues are complete, and final external closeout depends on release-state work
such as npm `latest`, the release tag, GitHub release visibility, and production
website deployment.

## Acceptance Checkpoints

### MVP Acceptance

An agent can create a valid DiagramPilot Source File, validate it, and render
an SVG Derived Artifact with real local CLI commands:

```bash
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
```

### Demo Project Acceptance

The Checkout Demo Project workflow should be checked with real local commands:

```bash
diagrampilot validate demo-projects/checkout/docs/architecture.dp.yaml
diagrampilot render demo-projects/checkout/docs/architecture.dp.yaml --out demo-projects/checkout/docs/architecture.svg
```

### Repo Workflow Check Acceptance

The shipped repo review workflow should be checked with the read-only command
before rendering or rewriting artifacts:

```bash
diagrampilot check
diagrampilot check demo-projects/checkout --json
```

### Maintainer Verification

Before merging roadmap-relevant implementation work, run:

```bash
npm test
```
