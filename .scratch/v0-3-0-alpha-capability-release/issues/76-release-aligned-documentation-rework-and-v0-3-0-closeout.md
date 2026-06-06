Status: ready-for-human
Issue Version: 0.3.0

# Release-aligned documentation rework and v0.3.0 closeout

## Parent

- [PRD](../PRD.md)

## What to build

Close the v0.3.0 Alpha Capability Release by proving the full PRD-scoped
feature set works together and reworking public and maintainer docs around the
v0.3.0 product shape. The docs should be tailored to repo-native source files,
validation, generated artifacts, configured repo workflows, MCP, alpha
expectations, and the `0.2 -> 0.3` upgrade path.

ADRs should be checked for continued applicability but generally not changed.
Only update an ADR if the implemented behavior creates a real decision-history
conflict that cannot be resolved in normal docs.

## User stories covered

- 1, 24, 61-66

## Acceptance criteria

- [ ] README and public docs describe the v0.3.0 behavior, not the older v0.2
      public-alpha shape.
- [ ] Public docs cover YAML-only source support and the JSON source removal.
- [ ] Public docs cover DOT export, PNG rendering, Repo Workflow Configuration,
      `generate`, generated Markdown embeds, MCP, Source Creation, and Source
      Mutation.
- [ ] Public MCP docs are labeled alpha.
- [ ] `llms.txt` links the public MCP guide.
- [ ] Website copy mentions MCP as a shipped agent integration while keeping
      the core story repo-native.
- [ ] A concise `0.2 -> 0.3` upgrade section explains source-format, command,
      config, generate, artifact, and MCP changes.
- [ ] Maintainer docs reflect Issue Releases, GitHub Releases, release notes,
      package publishing, CI-before-CD ordering, and v0.3.0 closeout.
- [ ] Package READMEs and public package references are aligned with the Public
      Package Set after MCP is introduced.
- [ ] ADRs are reviewed for applicability and left unchanged unless an actual
      decision-history conflict exists.
- [ ] The v0.3.0 release validates all PRD-scoped features together.
- [ ] The local PRD status, issue status, acceptance criteria, implementation
      notes, validation plan, and validation results are updated during
      closeout.
- [ ] GitHub Release notes for v0.3.0 summarize the full Alpha Capability
      Release.

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

## Validation plan

```bash
npm run build
npm test
npm run check:release-version
npm run check:package-readiness
npm --workspace website run build
npm --workspace website run check:visual
git diff --check
```
