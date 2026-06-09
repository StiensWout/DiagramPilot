Status: completed
Issue Version: 0.2.10

# MCP repo output generation tool

## Parent

- [PRD](../PRD.md)

## What to build

Add a side-effecting MCP tool that refreshes configured repo outputs through
DiagramPilot generation. The tool must require explicit paths or scopes and
must not default to the whole repository. It should return a structured
before/after summary and written paths rather than a full diff.

## User stories covered

- 46-48

## Acceptance criteria

- [x] MCP exposes a side-effecting repo output generation tool.
- [x] The generation tool requires explicit file paths or explicit directory
      scopes.
- [x] The generation tool has no whole-repo default.
- [x] The generation tool validates config before writes.
- [x] The generation tool uses the same write semantics as `diagrampilot
      generate`.
- [x] The generation tool returns structured before/after summaries.
- [x] The generation tool returns written paths, skipped paths, and repairable
      failures.
- [x] The generation tool does not return full diffs.
- [x] Invalid config, invalid sources, and unsafe output paths fail with
      repairable diagnostics.
- [x] Tests cover explicit paths, explicit directory scopes, no whole-repo
      default, configured output writes, path safety, structured summaries,
      written paths, skipped paths, and repairable failures.

## Blocked by

- [70 Generate command for configured outputs](./70-generate-command-for-configured-outputs.md)
- [72 MCP package, launch, resources, read tools, and prompts](./72-mcp-package-launch-resources-read-tools-and-prompts.md)

## Historic Fallow debt to resolve

Selected from `fallow health --format json --quiet --complexity` before
implementation. Dead-code findings were already clean; these are existing
baseline health findings.

- [x] Fallow health: `test/diagramspec-json-schema.test.mjs:48` `validate` severity=`critical`, cyclomatic=`28`, cognitive=`29`, CRAP=`812`.
- [x] Fallow health: `scripts/check-package-readiness.mjs:140` `collectPublicPackageMetadataIssues` severity=`critical`, cyclomatic=`25`, cognitive=`30`, CRAP=`650`.
- [x] Fallow health: `packages/core/src/repo-workflow-config.ts:279` `parseRepoWorkflowConfig` severity=`critical`, cyclomatic=`24`, cognitive=`41`, CRAP=`600`.
- [x] Fallow health: `packages/core/src/repo-workflow-generate.ts:232` `generateDiagramPilotRepoWorkflowWithDependencies` severity=`critical`, cyclomatic=`23`, cognitive=`40`, CRAP=`552`.
- [x] Fallow health: `packages/core/src/repo-workflow-config.ts:152` `validateArtifactMapping` severity=`critical`, cyclomatic=`21`, cognitive=`26`, CRAP=`462`.
- [x] Fallow health: `scripts/plan-release-publish.mjs:66` `createPlan` severity=`critical`, cyclomatic=`17`, cognitive=`15`, CRAP=`306`.
- [x] Fallow health: `scripts/check-release-version.mjs:60` `collectLockfileIssues` severity=`critical`, cyclomatic=`16`, cognitive=`25`, CRAP=`272`.
- [x] Fallow health: `website/scripts/check-visual-quality.mjs:319` `checkLandingHeroLayout` severity=`critical`, cyclomatic=`15`, cognitive=`21`, CRAP=`240`.
- [x] Fallow health: `packages/cli/src/cli-output.ts:146` `formatCheckTextReport` severity=`critical`, cyclomatic=`13`, cognitive=`29`, CRAP=`182`.
- [x] Fallow health: `packages/core/src/svg-artifact-freshness.ts:126` `extractSvgArtifactProvenance` severity=`critical`, cyclomatic=`13`, cognitive=`10`, CRAP=`182`.
- [x] Fallow health: `packages/core/src/diagramspec-topology-validation.ts:202` `validateGroupContainmentReferences` severity=`critical`, cyclomatic=`10`, cognitive=`14`, CRAP=`110`.
- [x] Fallow health: `packages/core/src/repo-workflow-check.ts:223` `checkDiagramPilotRepoWorkflowWithDependencies` severity=`critical`, cyclomatic=`10`, cognitive=`11`, CRAP=`110`.
- [x] Fallow health: `packages/core/src/diagramspec-validation.ts:363` `validateDiagramSpec` severity=`high`, cyclomatic=`9`, cognitive=`9`, CRAP=`90`.
- [x] Fallow health: `scripts/validate-github-release-draft.mjs:6` `parseArgs` severity=`high`, cyclomatic=`9`, cognitive=`11`, CRAP=`90`.
- [x] Fallow health: `packages/core/src/svg-artifact-freshness.ts:221` `checkExpectedSvgArtifactFreshnessForValidatedSource` severity=`high`, cyclomatic=`9`, cognitive=`11`, CRAP=`90`.
- [x] Fallow health: `packages/core/src/maintainability-file-size-gate.ts:131` `isExcludedAuthoredPath` severity=`high`, cyclomatic=`9`, cognitive=`8`, CRAP=`90`.
- [x] Fallow health: `packages/cli/src/generate-command-planning.ts:56` `formatGenerateTextReport` severity=`high`, cyclomatic=`9`, cognitive=`9`, CRAP=`90`.
- [x] Fallow health: `packages/cli/src/generate-command-planning.ts:87` `planGenerate` severity=`high`, cyclomatic=`9`, cognitive=`10`, CRAP=`90`.
- [x] Fallow health: `scripts/generate-release-notes.mjs:74` `formatReleaseNotes` severity=`high`, cyclomatic=`9`, cognitive=`9`, CRAP=`90`.
- [x] Fallow health: `packages/cli/src/init-command.ts:141` `runInit` severity=`high`, cyclomatic=`9`, cognitive=`10`, CRAP=`90`.
- [x] Fallow health: `packages/core/src/maintainability-file-size-gate.ts:182` `collectFiles` severity=`high`, cyclomatic=`8`, cognitive=`12`, CRAP=`72`.
- [x] Fallow health: `packages/core/src/diagramspec-topology-validation.ts:409` `validateGroupContainmentCycles` severity=`high`, cyclomatic=`8`, cognitive=`11`, CRAP=`72`.
- [x] Fallow health: `website/scripts/visual-quality-static-review.mjs:135` `staticLandingOverlay` severity=`high`, cyclomatic=`8`, cognitive=`7`, CRAP=`72`.
- [x] Fallow health: `packages/cli/src/cli-output.ts:108` `repairCommand` severity=`high`, cyclomatic=`8`, cognitive=`6`, CRAP=`72`.
- [x] Fallow health: `website/scripts/sync-public-docs.mjs:20` `listMarkdownFiles` severity=`high`, cyclomatic=`7`, cognitive=`9`, CRAP=`56`.
- [x] Fallow health: `scripts/check-release-version.mjs:31` `collectInternalDependencyIssues` severity=`high`, cyclomatic=`7`, cognitive=`14`, CRAP=`56`.
- [x] Fallow health: `scripts/check-release-version.mjs:198` `main` severity=`high`, cyclomatic=`7`, cognitive=`6`, CRAP=`56`.
- [x] Fallow health: `packages/core/src/diagramspec-validation.ts:48` `validateTopLevelCollectionShapes` severity=`high`, cyclomatic=`7`, cognitive=`6`, CRAP=`56`.
- [x] Fallow health: `scripts/bump-release-version.mjs:99` `main` severity=`high`, cyclomatic=`7`, cognitive=`5`, CRAP=`56`.
- [x] Fallow health: `packages/core/src/source-discovery.ts:180` `visitDirectory` severity=`high`, cyclomatic=`7`, cognitive=`11`, CRAP=`56`.

## Implementation notes

- Added `diagrampilot_generate_repo_outputs` as an MCP write tool with
  destructive/idempotent annotations.
- The tool requires non-empty `source_paths` or `scope_paths`; it does not
  default to the current repository.
- Generation delegates to the core repo workflow generator, writes the returned
  write intents with the same parent-directory creation and text/binary write
  behavior as `diagrampilot generate`, and returns redacted structured results
  without generated file contents or diffs.
- Added MCP runtime and stdio coverage for explicit source paths, explicit
  directory scopes, configured output writes, unsafe output paths, invalid
  sources, no whole-repo default, written paths, skipped paths, and repairable
  failures.
- Cleared all 30 selected historic Fallow health findings, including the 20
  follow-up findings requested after the first pass.
- Split large workflow, topology, SVG freshness, release, init, and website
  validation branches into focused helpers/modules while preserving behavior.

## Validation plan

```bash
npm test
node packages/cli/dist/index.js mcp --help
npm run audit:fallow
npm run audit:fallow:changed
git diff --check
```

## Validation results

- `npm test` passed.
- `node packages/cli/dist/index.js mcp --help` passed.
- `npm run audit:fallow` passed.
- `npm run audit:fallow:changed` passed.
- `npm run check:issue-release-version -- --issue .scratch/v0-3-0-alpha-capability-release/issues/73-mcp-repo-output-generation-tool.md` passed.
- `git diff --check` passed.
