Status: ready-for-agent

# Prepare First MCP Adapter PRD

## Parent

- [PRD](../PRD.md)

## What to build

Create the next PRD for the First MCP Adapter after the Public Website,
Public Documentation routes, and public schema route are stable. This issue
should prepare the MCP phase only; it should not implement the MCP server.

## Acceptance criteria

- [ ] A First MCP Adapter PRD is created under `.scratch/`.
- [ ] The PRD scopes MCP v1 as read-first plus explicit render/export writes.
- [ ] The PRD includes `list_diagrams`, `check_repo`, `validate_diagram`, `render_diagram`, and `export_diagram`.
- [ ] The PRD includes resources for public quickstart, spec, error repair, Checkout Demo Project, and DiagramSpec v1 schema.
- [ ] The PRD explicitly defers `create_diagram`, `add_node`, `connect_nodes`, and `update_node`.
- [ ] The PRD preserves the local-first no-SaaS-account requirement.
- [ ] The PRD avoids project analyzers, hosted diagram storage, visual editor state sync, and prompt-only generation.
- [ ] The PRD references stable public website/docs/schema routes from this phase.
- [ ] The PRD proposes implementation issue slices but does not publish them unless requested separately.

## Blocked by

- [43 Add DiagramSpec v1 JSON Schema](./43-add-diagramspec-v1-json-schema.md)
- [45 Publish docs-public through website routes](./45-publish-docs-public-through-website-routes.md)
- [47 Add Vercel deployment guidance and validation](./47-add-vercel-deployment-guidance-and-validation.md)

## Validation plan

```bash
find .scratch -maxdepth 3 -type f | sort
rg -n "First MCP Adapter|list_diagrams|check_repo|validate_diagram|render_diagram|export_diagram" .scratch
```
