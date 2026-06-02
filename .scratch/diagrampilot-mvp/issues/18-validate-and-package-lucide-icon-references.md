Status: ready-for-agent

# Validate and package Lucide Icon References

## Parent

- [PRD](../PRD.md)

## What to build

Support packaged Lucide Icon References end to end for the MVP. Validation
should distinguish supported `lucide:*` references from unsupported namespaces
and unknown icon names, using locally packaged icon metadata rather than a
hosted dependency.

## Acceptance criteria

- [ ] Supported `lucide:*` Icon References validate successfully.
- [ ] Unsupported namespaces and unknown icon names fail with repairable
      validation errors.
- [ ] Packaged icon metadata is available locally for later export and render
      steps.

## Blocked by

- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
