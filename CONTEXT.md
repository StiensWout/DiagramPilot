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

**Local Agent Documentation**:
Project-owned documentation inside a consuming repository that gives AI coding
agents repository-specific DiagramPilot guidance. It is distinct from Public
Documentation and should be intentionally adopted rather than treated as package
install output.
_Avoid_: Package payload, vendor docs copied by default, generated artifact

**Markdown-First Public Documentation**:
Public Documentation authored as Markdown so it remains readable in the
repository, directly editable by AI coding agents, and publishable to both
human-facing documentation pages and agent-facing Markdown routes.
_Avoid_: HTML-only docs, app-only documentation, UI-authored content

**Documentation Contract**:
The maintained agreement between canonical documentation sources, generated
public outputs, published routes, and drift checks.
_Avoid_: Manual docs audit, duplicated website content, one-off link cleanup

**Current-State Public Surface**:
Public Documentation, `README.md`, `llms.txt`, and Public Website copy that
describe shipped DiagramPilot behavior rather than deferred product plans or
internal design decisions.
_Avoid_: Public roadmap copy, planned integration docs, internal architecture
notes

**Public Repository Surface**:
The subset of committed repository content intended for external discovery,
adoption, and contribution. Maintainer material may be committed without being
part of the Public Repository Surface.
_Avoid_: Public website surface, package publish surface, generated review
reports

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
The marketable entry page of the Public Website that introduces DiagramPilot,
shows its repo-native value, and points users toward the demo workflow,
installation path, and Public Documentation.
_Avoid_: Hosted demo, application dashboard, docs index only, generic SaaS card
grid, glorified roadmap

**Public Landing Page Promise**:
The primary product promise that diagrams are repository files an AI coding
agent can safely change, validate, and commit.
_Avoid_: Generic AI diagram generation, hosted collaboration pitch, roadmap
summary

**DiagramPilot Brand Assets**:
The maintained visual identity assets for DiagramPilot, including the product
mark and wordmark used across the Public Website, Public Documentation, release
surfaces, and repository entrypoints.
_Avoid_: Generated demo artifact, visual regression screenshot, throwaway mockup

**Brand Use Policy**:
The public rules for using DiagramPilot names and Brand Assets separately from
the software license. It protects official product identity without restricting
normal software use under the code license.
_Avoid_: Code license, package license, noncommercial software license

**Code License**:
The permissive software license for DiagramPilot source, packages,
documentation, schema, website source, and Brand Assets. DiagramPilot uses
brand rules rather than a noncommercial software license to protect official
product identity.
_Avoid_: Brand Use Policy, noncommercial license, proprietary source grant

**Productization And Maintainability**:
A release-readiness phase that improves DiagramPilot's public product surface,
maintainer structure, and documentation contract before the next product
capability phase.
_Avoid_: MCP implementation release, hosted workspace launch, source mutation
phase, refactor-only phase

**Pre-Alpha Release**:
A versioned DiagramPilot release before the first Public Alpha Release. It may
be taggable or publishable, but it is not the first public release milestone.
_Avoid_: Public alpha, first public release, production-ready release

**Issue Version**:
A DiagramPilot version assigned to the completion of one implementation issue
after the current planning baseline. Issue Versions advance through pre-alpha
patch releases until the Public Alpha Release.
_Avoid_: Unversioned issue closeout, prerelease suffix, code-only milestone

**Public Alpha Release**:
The first public DiagramPilot release milestone intended for external discovery
and early adoption, with public repo hygiene, licensing, release workflow, and
current public documentation aligned.
_Avoid_: Pre-alpha release, production-ready release, private milestone

**DiagramPilot Release**:
A versioned DiagramPilot milestone represented by coordinated source,
package, website, documentation, and release-note state.
_Avoid_: Code-only tag, docs-only launch, website-only update

**Release Automation**:
The CI/CD workflow that validates a DiagramPilot release, publishes the Public
Package Set, and keeps the Public Website deployment path separate from package
publishing.
_Avoid_: Local validation only, manual package upload, website-only deployment

**Public Package Set**:
The installable DiagramPilot packages published together for a release so the
CLI and runtime package dependencies resolve coherently.
_Avoid_: CLI-only package, website deployment, source checkout

**Package Publishing Readiness**:
The release state where package metadata, licensing, tarball contents, package
name ownership, and CI checks are sufficient to publish the Public Package Set.
_Avoid_: Source-only release, unverified npm publish, website deployment

**Release-Ready Public Documentation**:
Public Documentation that is compact, coherent, published, current with the
release, and includes installation paths for supported ways to adopt
DiagramPilot.
_Avoid_: Internal planning notes, stale quickstart, unpublished docs draft

**Installation And Removal Guidance**:
Public Documentation that explains the supported ways to add DiagramPilot to a
repository or local environment and how to remove those installation paths
cleanly. It separates package uninstallation from repository cleanup after
DiagramPilot adoption.
_Avoid_: Contributor setup, internal build instructions, ad hoc cleanup notes

**Internal Documentation**:
Documentation for DiagramPilot maintainers that explains project workflow,
implementation plans, architecture decisions, and development process.
_Avoid_: Public user guide, public agent quickstart, product usage docs
