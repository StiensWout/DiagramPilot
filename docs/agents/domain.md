# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo currently uses a single-context domain docs layout:

- `CONTEXT.md` at the repo root for project vocabulary and domain concepts
- `docs/adr/` at the repo root for architectural decision records

If this repo later becomes a multi-context repo, add a root `CONTEXT-MAP.md` that points to each context-specific `CONTEXT.md`.

## Before exploring, read these

- `CONTEXT.md` at the repo root, if it exists.
- `CONTEXT-MAP.md` at the repo root, if it exists. It points at one `CONTEXT.md` per context; read each one relevant to the topic.
- `docs/adr/`, if it exists. Read ADRs that touch the area you're about to work in.
- In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, proceed silently. Don't flag their absence or suggest creating them upfront. The producer skill (`grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo:

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-example-decision.md
│   └── 0002-example-decision.md
└── docs/
```

Multi-context repo:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/
└── src/
    ├── compiler/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    └── web/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept in an issue title, refactor proposal, hypothesis, or test name, use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, either reconsider whether the term belongs to this project or note the gap for `grill-with-docs`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding it.
