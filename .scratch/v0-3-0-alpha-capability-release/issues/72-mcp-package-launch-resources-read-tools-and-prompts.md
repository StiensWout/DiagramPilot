Status: ready-for-agent
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

- [ ] `@diagrampilot/mcp` is added to the Public Package Set once introduced.
- [ ] `diagrampilot mcp` launches the MCP server.
- [ ] The MCP package exposes a dedicated package-level executable.
- [ ] MCP resources expose schema, docs, examples, discovered sources, and
      check results.
- [ ] MCP read tools expose validation, repo workflow checks, export, and
      render behavior.
- [ ] Read tools do not write files.
- [ ] A small prompt set exists for creating or updating sources from repo
      context, repairing validation errors, and refreshing artifacts.
- [ ] Prompt names and arguments are treated as public behavior and covered by
      tests.
- [ ] Public docs label MCP support as alpha and include client setup guidance.
- [ ] `llms.txt` links the MCP guide once MCP ships.
- [ ] Website copy mentions MCP as a shipped agent integration while keeping
      the repo-native product story.
- [ ] Maintainer docs explain package publishing setup, MCP package readiness,
      release workflow package lists, MCP client config, and smoke validation.
- [ ] Tests cover server launch, resources, read tools, prompt registry, CLI
      launch path, package executable, and public docs references.

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
