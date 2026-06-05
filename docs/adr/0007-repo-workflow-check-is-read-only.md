# Repo Workflow Check Is Read-Only

DiagramPilot's first Repo Workflow Check is a separate
`diagrampilot check` command rather than an extension of `validate`, because
`validate` is already the single-source correctness command and should not start
scanning repositories or checking artifacts. The first `check` command
discovers DiagramPilot Source Files within a local Check Scope, validates them,
and verifies next-to-source SVG Artifact Freshness by reading DiagramPilot
provenance metadata without rendering or writing files. This keeps repository
review and CI checks explicit while preserving intentional writes through
`diagrampilot render <source> --out <artifact.svg>`.
