# Market Research

Research date: June 2, 2026.

## Summary

The diagram generation space is already active. DiagramPilot should not compete
as a generic prompt-to-diagram product. The stronger position is a local-first,
repo-native diagram compiler and repair engine for AI coding agents.

## Closest Products

## Eraser

Eraser is the closest direct competitor. It offers AI diagrams, codebase
diagrams, diagram-as-code, MCP integration, agent skills, GitHub integration,
and `llms.txt`.

Implication: agent docs and `llms.txt` are table stakes, not enough by
themselves.

## Mermaid Chart MCP

Mermaid Chart provides an official MCP server that validates and renders Mermaid
diagrams, returns PNG/SVG output, creates summaries, and can manage Mermaid
Chart projects with authentication.

Implication: DiagramPilot should not be just a Mermaid MCP wrapper.

## Whimsical MCP

Whimsical has a desktop MCP server that lets coding agents create, edit, and
read Whimsical workspace content locally through the desktop app.

Implication: local MCP workflows are already expected by users.

## Miro MCP

Miro exposes MCP tools for reading boards, creating diagrams from DSL text, and
working with board items.

Implication: visual workspaces are moving quickly into agent workflows.

## Lucid MCP And Lucid GPT

Lucid supports AI diagram creation through ChatGPT and MCP-style workflows for
Microsoft 365 Copilot. It is strong in enterprise visual collaboration.

Implication: DiagramPilot should avoid competing on enterprise canvas features
early.

## Adjacent Ecosystem

- Mermaid: widely used Markdown-friendly diagram syntax.
- D2: modern local diagram language with strong CLI ergonomics.
- Structurizr: architecture-as-code and C4 modeling.
- Kroki: unified render API for many text diagram formats.
- PlantUML: mature UML and software diagram language.
- Graphviz DOT: mature graph layout and rendering ecosystem.
- Diagrams for Python: cloud architecture diagrams as Python code.

## Product Gap

DiagramPilot should focus on:

- Structured source specs for agents.
- YAML-first repo authoring.
- Repairable validation errors.
- Stable globally unique object IDs.
- Local CLI workflow.
- Review-stable SVG artifacts.
- Mermaid and D2 export.
- Namespaced packaged icon references.
- Compact agent documentation.
- MCP tools later that operate on diagram objects, not raw diagram strings.

## Positioning

DiagramPilot is a diagram compiler for AI coding agents.

It should be:

- Local-first.
- Repo-native.
- Version-control friendly.
- Renderer-agnostic at the source-model level.
- Agent-readable.
- Stable enough for code review.
- Easy to integrate into CI.

It should not start as:

- A hosted visual canvas.
- A generic AI diagram chatbot.
- A Mermaid-only renderer.
- A replacement for mature visual collaboration suites.
- A codebase analyzer.
