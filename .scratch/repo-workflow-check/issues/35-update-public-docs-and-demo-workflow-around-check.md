Status: pending

# Update public docs and demo workflow around check

## Parent

- [PRD](../PRD.md)

## What to build

After `diagrampilot check` is implemented, update Public Documentation and demo
workflow guidance so `check` is the repo-level review and CI command.

The docs should keep `validate` as the source repair command and `render` as the
explicit write command. They should not imply that `check` renders, fixes, or
updates artifacts.

## Acceptance criteria

- [ ] Public quickstart introduces `diagrampilot check` as the review/CI command after the command exists.
- [ ] Public docs explain that `check` is read-only.
- [ ] Public docs explain that v1 `check` uses next-to-source same-stem Expected SVG Artifacts.
- [ ] Public docs explain that SVG freshness is provenance-only in v1.
- [ ] Public docs keep `validate` as the detailed source repair command.
- [ ] Public docs keep `render <source> --out <artifact.svg>` as the explicit artifact repair command.
- [ ] Public docs do not promise Mermaid, D2, DOT, or PNG artifact freshness.
- [ ] Public docs do not mention configurable artifact mappings or ignore patterns as current behavior.
- [ ] Demo workflow validation covers `diagrampilot check` against the Checkout Demo Project.
- [ ] `llms.txt` continues to link only Public Documentation.

## Blocked by

- [34 Add check command planning with text and JSON output](./34-add-check-command-planning-with-text-and-json-output.md)

## Validation plan

```bash
node --test test/docs-public-boundary.test.mjs
node --test test/checkout-demo-project.test.mjs
(cd demo-projects/checkout && node ../../packages/cli/dist/index.js check)
npm test
```

