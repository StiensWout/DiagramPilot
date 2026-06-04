Status: ready-for-agent

# Update init guidance and build-aware validation plans

## Parent

- [PRD](../PRD.md)

## What to build

Update DiagramPilot adoption guidance emitted by `init` so new repositories see
`diagrampilot check` as the read-only repo review command before explicit
single-source repair and artifact refresh commands. Also make validation plans
for this phase build-aware when they run tests or commands that import compiled
workspace output.

This slice should keep Public Documentation, README workflow guidance, and the
Checkout Demo Project aligned with the current CLI contract.

## Acceptance criteria

- [ ] `diagrampilot init` support-file guidance includes `diagrampilot check`.
- [ ] `init` guidance describes `check` as read-only repo review/CI behaviour.
- [ ] `init` guidance keeps `validate` as the explicit source repair command.
- [ ] `init` guidance keeps `render <source> --out <artifact.svg>` as the explicit artifact refresh command.
- [ ] Public Documentation and README workflow guidance remain aligned with the `init` guidance.
- [ ] Tests cover the updated `init` support-file guidance.
- [ ] Issue validation plans for this phase use `npm run build && node --test ...` when invoking tests that import compiled workspace output.
- [ ] Final phase validation includes `npm test`, Checkout Demo Project text check, and Checkout Demo Project JSON check.

## Blocked by

- [39 Thin CLI check planning into an adapter](./39-thin-cli-check-planning-into-an-adapter.md)
- [40 Centralize provenance construction across render and check](./40-centralize-provenance-construction-across-render-and-check.md)
