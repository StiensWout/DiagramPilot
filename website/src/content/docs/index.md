---
title: DiagramPilot
description: Repo-native diagram compiler for AI coding agents.
template: splash
hero:
  tagline: Repo-native diagram compiler for AI coding agents.
  image:
    html: '<img src="/demo-projects/checkout/docs/architecture.svg" alt="Checkout Demo Project architecture diagram showing the browser, API, services, database, event stream, and fulfillment worker." />'
  actions:
    - text: Checkout Demo Project
      link: /docs/agents/quickstart/
      icon: right-arrow
    - text: Public Documentation
      link: /docs/
      variant: secondary
      icon: document
---

DiagramPilot turns local DiagramSpec files into review-stable SVG artifacts for
software repositories. It is built for AI coding agents that need diagrams to
live in the repo, survive code review, and fail with repairable errors.

The Checkout Demo Project is the shortest current workflow. Run it from
`demo-projects/checkout`:

```bash
diagrampilot check
diagrampilot validate docs/architecture.dp.yaml
diagrampilot render docs/architecture.dp.yaml --out docs/architecture.svg
diagrampilot export docs/architecture.dp.yaml --format mermaid
diagrampilot export docs/architecture.dp.yaml --format d2 --out docs/architecture.d2
```

`DiagramSpec` is the source of truth. Write or update `*.dp.yaml` and
`*.dp.json`, validate the source, and then render or export derived artifacts.
SVG, Mermaid, D2, DOT, and PNG are outputs or interop targets, not the primary
source.

Generated SVGs include deterministic provenance metadata, including the source
path, source hash, DiagramPilot version, and renderer. That keeps committed SVG
artifacts review-stable and lets `diagrampilot check` detect stale same-stem
SVG artifacts without rewriting files.
