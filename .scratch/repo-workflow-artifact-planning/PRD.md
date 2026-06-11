Status: completed

# Repo Workflow Artifact Planning

## Problem Statement

DiagramPilot maintainers need Repo Workflow Check and generation to evolve without duplicating Source File discovery, configured output ordering, output path resolution, and artifact execution knowledge across several modules. Today the behavior is correct, but the interface is shallow: a caller must know which helper owns each part of the same Repo Workflow Artifact concept.

## Solution

Deepen Repo Workflow Artifact planning so check and generate share one plan for each validated DiagramPilot Source File and its Derived Artifact outputs. Repo Workflow Check remains read-only, in line with ADR-0007, and Repo Workflow Generate remains the writing adapter.

## User Stories

1. As a DiagramPilot maintainer, I want check and generate to share output planning, so that artifact path bugs are fixed in one module.
2. As a DiagramPilot maintainer, I want Repo Workflow Check to stay read-only, so that CI and review workflows cannot rewrite repository files.
3. As a DiagramPilot maintainer, I want Repo Workflow Generate to use the same artifact order as check, so that review-stable rendering behavior is predictable.
4. As an AFK agent, I want a high-level artifact plan seam, so that tests can verify workflow behavior without duplicating fixture setup across modules.
5. As a code reviewer, I want format-specific freshness and writing behavior to stay in adapters, so that the planning module does not become a hidden executor.
6. As a future maintainer adding a Derived Artifact format, I want to add one planner case and one executor case, so that format support is local and explicit.

## Implementation Decisions

- Add a Repo Workflow Artifact planning module that converts a validated DiagramPilot Source File plus configured outputs into ordered artifact work items.
- Keep read-only check and writing generate as separate adapters over the shared plan.
- Preserve ADR-0007: planning can calculate paths and expected outputs, but Repo Workflow Check must not write files.
- Preserve existing DiagramSpec v1, DiagramPilot Source File loading, SVG Artifact Freshness, and Review-Stable Rendering semantics.
- Prefer the existing workflow result interfaces; this is a structural refactor, not a user-facing CLI change.

## Testing Decisions

- Good tests should exercise external workflow behavior: generated results, checked artifact status, output ordering, and read-only/write separation.
- The highest seam is Repo Workflow Check and Repo Workflow Generate result behavior.
- The supporting seam is the Repo Workflow Artifact plan for configured and default outputs.
- Existing CLI and workflow tests are the prior art; add focused coverage only where the plan creates a new observable seam.

## Out of Scope

- Changing public CLI command names, arguments, stdout, stderr, or exit codes.
- Changing DiagramSpec v1.
- Changing configured output schema.
- Changing SVG provenance or freshness semantics.
- Adding a hosted dependency or hosted workspace.
- Replacing D2 as the MVP SVG renderer.

## Further Notes

This work came from the architecture review at `/tmp/architecture-review-20260611-034517.html`. The top recommendation was selected because Repo Workflow Check and generation are two real adapters over the same planning seam.

Completed 2026-06-11. Repo Workflow Check and Repo Workflow Generate now share a Repo Workflow Artifact planning module for default SVG fallback, configured output order, configured/default path planning, display paths, and Markdown embed references.
