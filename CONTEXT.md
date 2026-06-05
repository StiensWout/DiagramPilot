# DiagramPilot

DiagramPilot is the product and domain context for repo-native diagrams created,
maintained, and reviewed with AI coding agents.

## Language

**DiagramPilot**:
A repo-native diagram compiler for AI coding agents. It is not a hosted canvas,
prompt-to-diagram chatbot, or general-purpose visual editor.
_Avoid_: Hosted diagram workspace, prompt-to-diagram app, visual editor

**DiagramSpec**:
The structured data model DiagramPilot uses as the source of truth for a
diagram. It is distinct from any particular file format or rendered output.
_Avoid_: Mermaid source, D2 source, diagram-as-code source

**DiagramPilot Source File**:
A repo file that stores a DiagramSpec, usually as `*.dp.yaml` or `*.dp.json`.
It is the editable artifact agents should preserve and update.
_Avoid_: Generated diagram, rendered artifact, output file

**Authoring Format**:
The concrete syntax used for a DiagramPilot Source File. YAML is the recommended
authoring format for humans and agents, while JSON is supported for tooling and
programmatic integrations.
_Avoid_: Separate model, renderer format, export target

**Derived Artifact**:
Any file or text generated from a DiagramPilot Source File rather than edited as
the source of truth. SVG and PNG are rendered artifacts; Mermaid, D2, and DOT
are exported artifacts.
_Avoid_: Source file, primary diagram, editable diagram

**Review-Stable Rendering**:
Rendered output that is stable enough for code review for the same DiagramPilot
version, renderer version, input, and environment.
_Avoid_: Perfect determinism, timestamped output, environment-dependent output

**Stable ID**:
A globally unique identifier for a diagram object within one DiagramSpec. Stable
IDs survive label changes, are preserved across diagram updates, and use
lowercase snake case.
_Avoid_: Display label, generated node number, local ID

**Diagram Object**:
A node, edge, or group in a DiagramSpec. DiagramPilot v1 uses one general
graph-shaped model for diagram objects rather than separate diagram-type models.
_Avoid_: Shape, box, visual item

**Node**:
A diagram object that can be connected by edges. In DiagramSpec v1, edge
endpoints reference nodes only.
_Avoid_: Box, component, endpoint target

**Group**:
A diagram object that contains nodes or other groups for visual and conceptual
organization. Groups may nest by containing other groups; in DiagramSpec v1,
each contained object has at most one parent group, and groups are not edge
endpoints.
_Avoid_: Container edge target, cluster endpoint, folder

**Kind**:
An open semantic tag on a diagram object. Known kinds may influence styling or
export behavior, while unknown kinds remain valid if they use a stable ID shape.
_Avoid_: Strict type, renderer-only style, enum

**Icon Reference**:
A namespaced reference to an icon used by a diagram object, such as
`aws:api_gateway` or `lucide:database`.
_Avoid_: Unqualified icon name, image URL, emoji

**Edge**:
A connection between two nodes that references endpoints with `from` and `to`.
Edges are directed by default; an optional flag may mark an edge as undirected.
Edge IDs are stable identities, not automatically regenerated from endpoints.
_Avoid_: Line, connector, arrow

**Metadata**:
A free-form extension object carried by DiagramSpec or a diagram object.
DiagramPilot may define well-known metadata keys while preserving unknown keys.
_Avoid_: Validation schema, annotations-only field, renderer config

**Source Reference**:
A local repository path or path-like glob that connects a diagram concept to the
repo content it represents.
_Avoid_: External URL, hosted project link, provenance note

**External Reference**:
A URL outside the local repository that points to supporting context for a
diagram concept.
_Avoid_: Source reference, local path, repo file

**Repairable Validation Error**:
A validation error that identifies the invalid spec path, explains the problem,
and gives a concrete repair step. Repairable validation errors are intended for
both humans and AI coding agents.
_Avoid_: Generic validation failure, renderer error, stack trace

**Demo Project**:
A checked-in sample repository fixture that demonstrates the DiagramPilot
workflow with real project files, DiagramPilot Source Files, and Derived
Artifacts.
_Avoid_: Hosted demo, docs-only example, isolated snippet

**Agent-First Documentation**:
Documentation written so AI coding agents can execute repo-native workflows from
explicit files, commands, and validation expectations, while remaining readable
to human maintainers.
_Avoid_: Marketing copy, human-only tutorial, vague onboarding guide

**Markdown-First Public Documentation**:
Public Documentation authored as Markdown so it remains readable in the
repository, directly editable by AI coding agents, and publishable to both
human-facing documentation pages and agent-facing Markdown routes.
_Avoid_: HTML-only docs, app-only documentation, UI-authored content

**Repo Workflow**:
A DiagramPilot product capability area for operating on DiagramPilot Source
Files and Derived Artifacts across a local repository, rather than on one
explicit source file at a time.
_Avoid_: Hosted workspace workflow, visual editor workflow, project analyzer

**Artifact Freshness**:
The relationship between a DiagramPilot Source File and a Derived Artifact when
the artifact corresponds to the source and DiagramPilot generation context it
was produced from.
_Avoid_: Source validity, wall-clock freshness, hand-edited artifact

**Repo Workflow Check**:
A Repo Workflow operation that evaluates local diagram workflow health across a
repository, including discovered DiagramPilot Source Files and their expected
Derived Artifacts.
_Avoid_: Single-file validation, hosted project audit, codebase analyzer

**Read-Only Check**:
A Repo Workflow Check that reports discovered workflow problems without
rewriting DiagramPilot Source Files, rendering Derived Artifacts, or updating
existing artifacts.
_Avoid_: Fix command, auto-render, source rewrite

**Check Scope**:
The local directory tree or explicit DiagramPilot Source File a Repo Workflow
Check evaluates. The first Repo Workflow Check uses the current working
directory by default, or one explicit directory or source file path when
provided.
_Avoid_: Git root auto-detection, hosted workspace scope, global filesystem scan

**SVG Artifact Freshness**:
Artifact Freshness for an SVG Derived Artifact generated from a DiagramPilot
Source File. The first Repo Workflow Check focuses on SVG Artifact Freshness
before checking exported text formats.
_Avoid_: Mermaid freshness, D2 freshness, PNG freshness, source validation

**Stale SVG Artifact**:
An Expected SVG Artifact that does not match the current DiagramPilot Source
File and generation context recorded in DiagramPilot provenance metadata.
Missing DiagramPilot provenance is treated as stale artifact evidence, not as a
source validation error.
_Avoid_: Invalid DiagramPilot Source File, old file by timestamp, manual SVG
review

**Provenance-Only Freshness Check**:
An SVG Artifact Freshness check that reads DiagramPilot provenance metadata and
does not render or byte-compare SVG output.
_Avoid_: Render verification, generated output diff, timestamp comparison

**Expected SVG Artifact**:
The SVG Derived Artifact that a Repo Workflow Check expects for a DiagramPilot
Source File. In the first Repo Workflow Check, it is the next-to-source SVG with
the same filename stem as the source, and provenance source paths are compared
relative to the Check Scope for directory checks.
_Avoid_: Configured output path, exported text artifact, arbitrary SVG

**Checkout Demo Project**:
The Demo Project domain used to demonstrate DiagramPilot with one end-to-end
architecture diagram for a small checkout system.
_Avoid_: Demo gallery, unrelated sample app, abstract toy diagram

**Public Documentation**:
Documentation for AI coding agents and developers using DiagramPilot in their
own repositories.
_Avoid_: Maintainer workflow notes, implementation planning docs, private
project process

**Public Website**:
The public web presence for DiagramPilot, including the product entry point and
Public Documentation under `diagrampilot.com`. It is not a hosted diagram
workspace or prompt-only diagram generation surface.
_Avoid_: Hosted workspace, visual editor, prompt-to-diagram app

**Public Landing Page**:
The entry page of the Public Website that introduces DiagramPilot and points
users toward the demo workflow, installation path, and Public Documentation.
_Avoid_: Hosted demo, application dashboard, docs index only

**Internal Documentation**:
Documentation for DiagramPilot maintainers that explains project workflow,
implementation plans, architecture decisions, and development process.
_Avoid_: Public user guide, public agent quickstart, product usage docs
