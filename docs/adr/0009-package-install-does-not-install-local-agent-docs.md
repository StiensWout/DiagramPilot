# Package Install Does Not Install Local Agent Docs

DiagramPilot package installation must not add local agent documentation to a
consuming repository. `npx diagrampilot ...`,
`npm install --save-dev diagrampilot`, and
`npm install --global diagrampilot` provide command availability only.

Local agent instruction files such as `llms.txt` and `docs/diagrampilot.md`
belong to the consuming repository. DiagramPilot can publish canonical agent
context at `https://diagrampilot.com/llms.txt` and Public Documentation under
`https://diagrampilot.com/docs/...`; agents can use those sources, repository
instructions, or configured context providers without requiring copied vendor
docs in the repo.

The current `diagrampilot init` support-file behavior is historical MVP
scaffolding and should not be treated as the long-term install path. Normal
`diagrampilot init` should avoid local agent docs by default.
`diagrampilot init --docs` is the explicit path for creating or updating
managed local agent docs.

Repository cleanup docs should continue to explain how to remove existing
`diagrampilot:init` managed sections, because users may already have support
files created by earlier init behavior.
