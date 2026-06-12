# Comparisons And Adjacent Tools

DiagramPilot is a repo-native diagram compiler for AI coding agents. It keeps
DiagramPilot Source Files as the editable source of truth, validates
DiagramSpec data locally, and refreshes review-stable Derived Artifacts such as
SVG, PNG, Mermaid, D2, and DOT outputs.

DiagramPilot is not a generic diagramming replacement. Use it when diagrams
need stable IDs, repairable validation, local repository checks, and artifacts
that can be reviewed in Git. Use adjacent tools directly when their native
language, renderer, static analysis, or interactive UI is the primary product.

## Mermaid

Mermaid is best at Markdown-native diagrams such as flowcharts, sequence
diagrams, state diagrams, and other lightweight charts that render in common
documentation surfaces.

DiagramPilot complements Mermaid by keeping DiagramSpec as the validated source
and exporting Mermaid as one Derived Artifact. That works well when an agent
needs a repo-native software architecture diagram that can also appear in
Markdown tools that already support Mermaid.

Choose Mermaid directly when the diagram belongs inline in a README or issue,
when Mermaid's diagram type is the real source format, or when maintainers want
to edit Mermaid syntax by hand.

## D2

D2 is best at declarative diagramming when the D2 text language and renderer are
the authored source. It is useful for polished text-to-diagram workflows,
custom diagram syntax, and teams that want to work directly in D2.

DiagramPilot complements D2 by exporting D2 from the same validated DiagramSpec
source used for SVG, PNG, Mermaid, and DOT. That keeps architecture-as-code and
diagram-as-code reviews centered on one `*.dp.yaml` file while still producing
a D2 artifact for D2-native rendering or sharing.

Choose D2 directly when the D2 language is the team's preferred source of truth,
when D2-specific styling is required, or when a DiagramPilot Source File would
only mirror an existing D2 document.

## Graphviz/DOT

Graphviz/DOT is best at graph descriptions, automatic graph layout, and tool
chains that already emit or consume DOT. It is a strong fit for structural
graphs, generated dependency diagrams, and workflows where Graphviz layout
engines are the expected renderer.

DiagramPilot complements Graphviz/DOT by exporting DOT from a DiagramSpec model
that also carries labels, groups, metadata, stable IDs, and the local
DiagramPilot workflow. Use that when maintainers want one reviewed source file
and DOT is one output format among several.

Choose Graphviz/DOT directly when another analyzer already emits DOT, when the
layout engine and DOT attributes are the main control surface, or when the
diagram is a generated graph rather than an agent-maintained architecture
source.

## dependency-cruiser

dependency-cruiser is best at JavaScript and TypeScript dependency analysis. It
can validate dependency rules, report violations for builds, and produce
dependency graph output from source code.

DiagramPilot complements dependency-cruiser by documenting the architectural
view that maintainers want agents to preserve. A dependency-cruiser report can
inform the DiagramPilot Source File, and DiagramPilot can then keep the
high-level codebase diagram reviewable beside other architecture documentation.

Choose dependency-cruiser directly when the goal is automated dependency rule
enforcement, module boundary checks, or a generated graph of the current
JavaScript or TypeScript import structure.

## React Flow

React Flow is best at interactive node-based UIs in React. It is the right
choice for browser editors, workflow builders, live graph exploration, and
applications where users drag, connect, select, and edit nodes on screen.

DiagramPilot complements React Flow when the repository needs a local,
reviewable DiagramSpec source and static Derived Artifacts for docs or pull
request review. A product can use React Flow for an interactive editor while
DiagramPilot remains the repo-native compiler for committed architecture docs.

Choose React Flow directly when the primary requirement is an interactive
diagram application, custom React nodes, canvas controls, or user-driven editing
inside a web UI.
