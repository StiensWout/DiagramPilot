Status: completed
Issue Version: 0.2.9

# MCP package, launch, resources, read tools, and prompts

## Parent

- [PRD](../PRD.md)

## What to build

Add `@diagrampilot/mcp` as a public package and ship the alpha MCP server
foundation. The documented user launch path is `diagrampilot mcp`, with a
dedicated package-level executable for MCP clients that expect direct commands.

The server should expose resources for schema, docs, examples, discovered
sources, and check results; read tools for validation, repo workflow checks,
export, and render; and a small public prompt set for common DiagramPilot agent
workflows. The issue should also document maintainer setup for package
publishing, MCP client configuration, smoke validation, and release workflow
package lists.

## User stories covered

- 40-45, 49-50, 61-63

## Acceptance criteria

- [x] `@diagrampilot/mcp` is added to the Public Package Set once introduced.
- [x] `diagrampilot mcp` launches the MCP server.
- [x] The MCP package exposes a dedicated package-level executable.
- [x] MCP resources expose schema, docs, examples, discovered sources, and
      check results.
- [x] MCP read tools expose validation, repo workflow checks, export, and
      render behavior.
- [x] Read tools do not write files.
- [x] A small prompt set exists for creating or updating sources from repo
      context, repairing validation errors, and refreshing artifacts.
- [x] Prompt names and arguments are treated as public behavior and covered by
      tests.
- [x] Public docs label MCP support as alpha and include client setup guidance.
- [x] `llms.txt` links the MCP guide once MCP ships.
- [x] Website copy mentions MCP as a shipped agent integration while keeping
      the repo-native product story.
- [x] Maintainer docs explain package publishing setup, MCP package readiness,
      release workflow package lists, MCP client config, and smoke validation.
- [x] Tests cover server launch, resources, read tools, prompt registry, CLI
      launch path, package executable, and public docs references.

## Research and TDD plan

- Use the official MCP TypeScript SDK server guidance for a local stdio server
  with registered resources, read-only tools, and prompts.
- Keep issue 72 scoped to read-only MCP behavior. Leave repo output generation,
  source creation, and source mutation for issues 73-75.
- Build in vertical test slices: package metadata and executable, CLI launch
  path, resource registry, read-tool registry and handlers, prompt registry,
  public docs, then maintainer docs.
- Resolve the 30 Fallow historic duplicate-code findings listed below before
  closeout and update this issue with validation results.

## Fallow historic tech debt target

- [x] 1. `dup:63dcfb35`:
      `packages/core/src/diagramspec-metadata-validation.ts:94-102` and
      `packages/core/src/diagramspec-validation.ts:195-203`.
- [x] 2. `dup:330e8363`:
      `packages/core/src/diagramspec-metadata-validation.ts:94-102`,
      `packages/core/src/diagramspec-validation.ts:169-177`, and
      `packages/core/src/diagramspec-validation.ts:195-203`.
- [x] 3. `dup:8137c496`:
      `packages/core/src/diagramspec-topology-validation.ts:355-364` and
      `packages/core/src/diagramspec-topology-validation.ts:432-441`.
- [x] 4. `dup:069ba2b1`:
      `packages/core/src/diagramspec-validation.ts:82-98` and
      `packages/core/src/diagramspec-validation.ts:167-179`.
- [x] 5. `dup:cff94e97`:
      `packages/core/src/diagramspec-validation.ts:169-181` and
      `packages/core/src/diagramspec-validation.ts:320-332`.
- [x] 6. `dup:7087a7fd`:
      `packages/core/src/diagramspec-validation.ts:292-303` and
      `packages/core/src/diagramspec-validation.ts:317-328`.
- [x] 7. `dup:f3ea6507`:
      `packages/core/src/diagramspec-validation.ts:350-362` and
      `packages/core/src/diagramspec-validation.ts:379-389`.
- [x] 8. `dup:9792507e`:
      `packages/core/src/repo-workflow-config.ts:309-317` and
      `packages/core/src/source-loading.ts:202-210`.
- [x] 9. `dup:6a6d49c3`: `packages/export-d2/src/index.ts:56-76`
      and `packages/export-mermaid/src/index.ts:58-78`.
- [x] 10. `dup:63c1c62a`: `packages/export-d2/src/index.ts:77-87`
       and `packages/export-mermaid/src/index.ts:78-88`.
- [x] 11. `dup:25f3daea`: `packages/export-dot/src/index.ts:105-122`
       and `packages/export-mermaid/src/index.ts:61-78`.
- [x] 12. `dup:2d62ce57`: `packages/export-dot/src/index.ts:128-145`
       and `packages/export-mermaid/src/index.ts:80-97`.
- [x] 13. `dup:f50f23c4`: `scripts/bump-release-version.mjs:2-21`
       and `scripts/check-release-version.mjs:2-21`.
- [x] 14. `dup:f3680f22`: `scripts/bump-release-version.mjs:23-57`
       and `scripts/check-release-version.mjs:19-53`.
- [x] 15. `dup:7994a629`:
       `scripts/check-package-publish-state.mjs:95-108` and
       `scripts/check-package-publish-state.mjs:122-135`.
- [x] 16. `dup:1d2a979a`: `test/checkout-demo-project.test.mjs:33-54`
       and `test/cli-smoke-helpers.mjs:55-76`.
- [x] 17. `dup:0f343855`: repeated child-process helpers across
       checkout demo, CLI smoke, documentation, release, package, website,
       and readiness tests.
- [x] 18. `dup:008c04dc`:
       `test/checkout-demo-project.test.mjs:57-77` and
       `test/checkout-demo-project.test.mjs:82-102`.
- [x] 19. `dup:955257ff`:
       `test/checkout-demo-project.test.mjs:121-128` and
       `test/checkout-demo-project.test.mjs:134-140`.
- [x] 20. `dup:3c149b89`:
       `test/checkout-demo-project.test.mjs:122-128`,
       `test/cli-smoke.test.mjs:22-27`,
       `test/package-publish-state.test.mjs:98-105`, and
       `test/package-publish-state.test.mjs:119-126`.
- [x] 21. `dup:0e332b41`:
       `test/checkout-demo-project.test.mjs:134-142`,
       `test/cli-check-smoke.test.mjs:17-25`, and
       `test/cli-check-smoke.test.mjs:128-137`.
- [x] 22. `dup:9064ace1`:
       `test/checkout-demo-project.test.mjs:158-164`,
       `test/cli-smoke.test.mjs:390-396`, and
       `test/cli-smoke.test.mjs:451-457`.
- [x] 23. `dup:d1a67449`:
       `test/cli-check-command-planning.test.mjs:195-292` and
       `test/cli-command-planning.test.mjs:84-96`.
- [x] 24. `dup:319ee7f2`:
       `test/cli-check-command-planning.test.mjs:306-384` and
       `test/cli-command-planning.test.mjs:43-53`.
- [x] 25. `dup:7223ab12`:
       `test/cli-check-smoke.test.mjs:17-27` and
       `test/cli-check-smoke.test.mjs:127-139`.
- [x] 26. `dup:0549bf6d`:
       `test/cli-check-smoke.test.mjs:17-23`,
       `test/cli-check-smoke.test.mjs:127-135`,
       `test/cli-smoke.test.mjs:223-230`, and
       `test/cli-smoke.test.mjs:291-298`.
- [x] 27. `dup:905d5867`:
       `test/cli-check-smoke.test.mjs:127-135` and
       `test/cli-smoke.test.mjs:223-230`.
- [x] 28. `dup:72568c7f`:
       `test/cli-command-planning-helpers.mjs:1-19` and
       `test/cli-validate-json-output.test.mjs:6-24`.
- [x] 29. `dup:9a582ca5`:
       `test/cli-command-planning-helpers.mjs:120-132` and
       `test/cli-validate-json-output.test.mjs:44-56`.
- [x] 30. `dup:7a8913b3`:
       `test/cli-command-planning.test.mjs:44-53` and
       `test/cli-validate-json-output.test.mjs:79-88`.

## Blocked by

- [64 Release ops foundation and GitHub Releases](./64-release-ops-foundation-and-github-releases.md)
- [67 YAML-only source support](./67-yaml-only-source-support.md)

## Validation plan

```bash
npm test
npm run check:package-readiness
node packages/cli/dist/index.js mcp --help
git diff --check
```

## Implementation notes

- Added the public `@diagrampilot/mcp` workspace package with
  `diagrampilot-mcp` as its package executable and wired `diagrampilot mcp`
  through the CLI package.
- Implemented the alpha stdio MCP server with resource templates for schema,
  docs, examples, discovered sources, and repo workflow check results.
- Implemented read-only MCP tools for source validation, repo workflow checks,
  text export, and SVG rendering. Render returns SVG text through MCP and does
  not write files.
- Added public MCP prompts for creating or updating sources, repairing
  validation errors, and refreshing derived artifacts.
- Added public docs, `llms.txt`, README, website copy, release workflow docs,
  package readiness coverage, and documentation-contract coverage for the MCP
  package and launch paths.
- Synced release metadata to `0.2.9`.
- Resolved the 30 listed Fallow duplicate fingerprints. Final duplicate report
  check: `active targets 0`, with current duplicate percentage reduced to
  `8.425233644859812`.
- Added a narrow `.fallowrc.jsonc` dependency exception for the intentional
  published CLI dependency on `@diagrampilot/mcp`; the CLI imports it for
  `diagrampilot mcp`, but Fallow does not connect that workspace package edge.

## Validation results

```bash
npm test
# pass: 226 tests

npm run check:package-readiness
# pass: 8 public packages

node packages/cli/dist/index.js mcp --help
# pass: prints DiagramPilot MCP server usage

git diff --check
# pass

npm run audit:fallow
# pass

npm run audit:fallow:changed
# pass
```
