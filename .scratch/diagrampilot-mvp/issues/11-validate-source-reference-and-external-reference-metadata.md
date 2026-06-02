Status: ready-for-agent

# Validate Source Reference and External Reference metadata semantics

## Parent

- [PRD](../PRD.md)

## What to build

Add validation rules for the documented Metadata meanings of Source Reference
and External Reference fields. This slice should make repo-native paths and
external URLs distinct and repairable when used incorrectly.

## Acceptance criteria

- [ ] `metadata.source` validates as a local repository path or path-like glob.
- [ ] `metadata.external_url` validates as an external URL.
- [ ] Tests cover valid Source References, valid External References, and
      clearly invalid values for each field.

## Blocked by

- [10 Preserve open `kind` and unknown `metadata` keys through validation](./10-preserve-open-kind-and-unknown-metadata-keys.md)
