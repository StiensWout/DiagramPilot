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

**Checkout Demo Project**:
The Demo Project domain used to demonstrate DiagramPilot with one end-to-end
architecture diagram for a small checkout system.
_Avoid_: Demo gallery, unrelated sample app, abstract toy diagram

**Public Documentation**:
Documentation for AI coding agents and developers using DiagramPilot in their
own repositories.
_Avoid_: Maintainer workflow notes, implementation planning docs, private
project process

**Internal Documentation**:
Documentation for DiagramPilot maintainers that explains project workflow,
implementation plans, architecture decisions, and development process.
_Avoid_: Public user guide, public agent quickstart, product usage docs
