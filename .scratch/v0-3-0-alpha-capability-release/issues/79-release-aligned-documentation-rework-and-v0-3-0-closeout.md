Status: completed
Issue Version: 0.3.0

# Release-aligned documentation rework and v0.3.0 closeout

## Parent

- [PRD](../PRD.md)

Close the v0.3.0 Alpha Capability Release by proving the full PRD-scoped
feature set works together and by completing a full documentation review and
in-place rework across the public, package, demo, and maintainer documentation
surfaces.

This issue is a release-blocking closeout gate. Stale, v0.2-oriented, or
internally inconsistent documentation blocks v0.3.0. The implementation should
rewrite incorrect or incomplete docs in place, not only report gaps. Follow-up
issues are acceptable only for non-release-blocking refinements that do not
affect shipped behavior, install instructions, MCP usage, upgrade guidance,
package publishing, release operations, or public route correctness.

Docs must be checked against implemented behavior and package metadata, not only
against the PRD text. In particular, verify command help, tests, package
manifests, and generated/public website routes when documenting shipped CLI,
MCP, package, or release workflows.

ADRs must be reviewed for continued applicability. Do not update an ADR unless
implemented behavior creates a real decision-history conflict that cannot be
resolved in normal docs.

## User stories covered

- 1
- 24
- 61-66

## Blocked by

- [64 Release ops foundation and GitHub Releases](./64-release-ops-foundation-and-github-releases.md)
- [65 Add DOT export](./65-add-dot-export.md)
- [66 Add PNG rendering](./66-add-png-rendering.md)
- [67 YAML-only source support](./67-yaml-only-source-support.md)
- [68 Repo Workflow Configuration foundation](./68-repo-workflow-configuration-foundation.md)
- [69 Configured artifact mappings and freshness](./69-configured-artifact-mappings-and-freshness.md)
- [70 Generate command for configured outputs](./70-generate-command-for-configured-outputs.md)
- [71 Generated Markdown embeds](./71-generated-markdown-embeds.md)
- [72 MCP package, launch, resources, read tools, and prompts](./72-mcp-package-launch-resources-read-tools-and-prompts.md)
- [73 MCP repo output generation tool](./73-mcp-repo-output-generation-tool.md)
- [74 MCP Source Creation](./74-mcp-source-creation.md)
- [75 MCP Source Mutation](./75-mcp-source-mutation.md)
- [76 Fallow duplicate-code cleanup and MCP version sync fix](./76-fallow-duplicate-code-cleanup.md)
- [77 Fallow health cleanup](./77-fallow-health-cleanup.md)
- [78 Fallow clean gate and policy](./78-fallow-clean-gate-and-policy.md)

## Documentation inventory

Review and update these surfaces as needed:

- Root public entrypoints: `README.md` and `llms.txt`.
- Canonical public docs under `docs-public/**`, including quickstart,
  installation, spec, error repair, examples, prompting, MCP, and upgrade
  guidance.
- Public website routes and generated docs pages, including route coverage
  listed in `docs/development/documentation-contract.md`.
- Demo project documentation and examples, especially
  `demo-projects/checkout/README.md` and docs referenced by public examples.
- Package-local public docs and package metadata, including package READMEs for
  `packages/cli`, `packages/core`, exporters, renderers, icons, and
  `packages/mcp`.
- Maintainer release/version docs, including
  `docs/development/documentation-contract.md`,
  `docs/development/release-version-workflow.md`,
  `docs/development/public-website-deployment.md`,
  `docs/development/roadmap.md`, and related package-readiness notes.
- ADRs under `docs/adr/**`, reviewed for continued applicability only.
- The v0.3.0 PRD and local issue tracker closeout notes under `.scratch/**`.

## Required content alignment

The completed docs must consistently describe the v0.3.0 product shape:

- DiagramPilot Source Files are YAML-only for authored diagram sources; legacy
  `*.dp.json` source files are unsupported and should receive repairable
  diagnostics.
- JSON remains appropriate for structured CLI output, schema/provenance
  metadata, package manifests, and other non-source surfaces.
- DOT export is a text Derived Artifact available through
  `diagrampilot export --format dot`.
- PNG rendering is available through `diagrampilot render --format png` and is
  produced by rasterizing the SVG render path.
- Repo Workflow Configuration is optional, discovered from command scope, and
  does not replace zero-config use.
- Configured artifact mappings, freshness checks, and source ignore behavior
  match implemented `check` behavior.
- `diagrampilot generate [path]` is the command that rewrites configured
  Derived Artifacts and generated Markdown embeds.
- Generated Markdown embeds are standalone generated files; DiagramPilot does
  not edit arbitrary prose documents in place.
- MCP is a shipped alpha integration with version-aligned package docs, launch
  guidance, resources, tools, prompts, repo output generation, Source Creation,
  and Source Mutation.
- Source Creation and Source Mutation docs use Stable IDs and Structured
  Diagram Operations, not raw YAML replacement as the supported agent workflow.
- Alpha expectations remain explicit; v0.3.0 is not positioned as beta or
  production-ready.
- `0.2 -> 0.3` upgrade guidance calls out source-format, command, config,
  generated artifact, Markdown embed, and MCP changes.
- Public URLs use `https://diagrampilot.com`.

## Acceptance criteria

- Public docs, package docs, demo docs, maintainer docs, and release docs are
  reviewed against implemented v0.3.0 behavior and rewritten in place wherever
  stale or incomplete.
- Package-local README files and package metadata docs that are published or
  used for package readiness match the website/root documentation.
- The documentation contract lists all shipped public routes and current command
  surfaces.
- Public docs include MCP after MCP ships, and `llms.txt` links or summarizes
  the supported MCP integration path.
- Upgrade guidance from `0.2` to `0.3` is concise, visible, and accurate.
- ADR applicability is checked; any ADR change is justified by a real
  decision-history conflict.
- The PRD, issue status, acceptance criteria, implementation notes, validation
  plan, and validation results are updated during closeout.
- GitHub Release notes for v0.3.0 summarize the full Alpha Capability Release.

## Validation plan

Run the full closeout gate:

```bash
npm run build
npm test
npm run audit:fallow
npm run audit:fallow:changed
npm run check:release-version
npm run check:package-readiness
npm --workspace website run build
npm --workspace website run check:visual
git diff --check
```

Also spot-check docs against real command/package behavior:

```bash
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js check --help
node packages/cli/dist/index.js generate --help
node packages/cli/dist/index.js render --help
node packages/cli/dist/index.js export --help
node packages/cli/dist/index.js mcp --help
```

## Implementation notes

- Scope decisions resolved during planning: this is a full docs review and
  rework, not a narrow wording cleanup; docs rewrites are required in place;
  package-local READMEs and published package docs are in scope; the issue uses
  an explicit docs inventory checklist; and documentation correctness is
  release-blocking for v0.3.0 closeout.
- Reworked root, public, package-local, demo-facing, website deployment, and
  maintainer documentation around the v0.3.0 release-aligned product shape.
- Added release-aligned documentation contract coverage for the v0.3.0 upgrade
  path and public package README surfaces.
- Added subcommand `--help` support for `check`, `generate`, `render`, and
  `export` so documentation spot checks can use real command help output.
- Updated public boundary tests so Source Mutation is treated as shipped MCP
  behavior instead of forbidden future language.
- Synced shared release metadata from issue 79 to `0.3.0`.
- Reviewed ADR applicability; no ADR needed a decision-history update.

## Validation results

```bash
npm run sync:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/79-release-aligned-documentation-rework-and-v0-3-0-closeout.md
npm run build
npm test
npm run audit:fallow
npm run audit:fallow:changed
npm run check:release-version
npm run check:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/79-release-aligned-documentation-rework-and-v0-3-0-closeout.md
npm run check:package-readiness
npm --workspace website run build
npm --workspace website run check:visual
git diff --check
```

All validation commands passed. `npm test` passed 255 tests. Fallow full and
changed-code gates passed. Package readiness passed for 8 public packages.
Command-help spot checks passed for top-level help, `check`, `generate`,
`render`, `export`, and `mcp`.
