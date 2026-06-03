Status: ready-for-agent

# Split Public Documentation and Internal Documentation roots

## Parent

- [PRD](../PRD.md)

## What to build

Separate Public Documentation from Internal Documentation while preserving the
public URL contract. Public usage docs should live in the public docs root and
remain written for agents and developers using DiagramPilot. Maintainer workflow
docs, ADRs, roadmap material, and issue-tracker guidance should remain internal.

## Acceptance criteria

- [ ] Public-facing usage docs are located in the public docs root.
- [ ] Internal maintainer docs remain in the internal docs tree.
- [ ] Public docs links continue to use `https://diagrampilot.com/docs/...`.
- [ ] `llms.txt` links only Public Documentation and does not expose internal
      maintainer workflow docs.
- [ ] Repository guidance still points maintainers and agents to the internal
      issue-tracker, triage-label, domain-doc, roadmap, and ADR locations.

## Blocked by

None - can start immediately.
