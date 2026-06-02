# TypeScript Workspace For The MVP

DiagramPilot's MVP implementation uses a TypeScript package workspace. This
keeps the DiagramSpec model, JSON Schema validation, CLI, exporters, and future
MCP server in one ecosystem, and it fits available JavaScript layout tooling
while still allowing external renderers such as D2 to be invoked locally.
