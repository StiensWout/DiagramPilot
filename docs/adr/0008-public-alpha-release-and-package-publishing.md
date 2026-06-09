# Public Alpha Release And Package Publishing

DiagramPilot's Public Alpha Release uses MIT as the Code License and a separate
Brand Use Policy for official product identity.

The MIT Code License covers the repository's code, docs, schema, website source,
package source, and committed brand asset files. The Brand Use Policy protects
the DiagramPilot name, mark, wordmark, `diagrampilot.com` domain, and official
release identity from confusing or endorsement-implying use. This keeps normal
software freedoms separate from official product identity.

The Public Package Set is:

- `diagrampilot`
- `@diagrampilot/core`
- `@diagrampilot/icons`
- `@diagrampilot/export-mermaid`
- `@diagrampilot/export-d2`
- `@diagrampilot/export-dot`
- `@diagrampilot/mcp`
- `@diagrampilot/render-svg`

The root workspace and `website` workspace remain private and unpublished. They
may carry MIT license metadata, but they are not part of the Public Package Set.

Pre-alpha package publishes use the `prealpha` npm dist-tag while package names,
metadata, CI, and release automation are being proven. v0.2.0 is the first
Public Alpha Release and publishes under `latest`.

Release validation includes package metadata checks and `npm pack --dry-run`
checks for every public workspace. Tarballs must include the MIT license text
and expected built package content, while excluding internal documentation,
ADRs, agent workflow docs, `.scratch/` planning files, website build output,
local caches, generated visual reports, and source-only planning files.
