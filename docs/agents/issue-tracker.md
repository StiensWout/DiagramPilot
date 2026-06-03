# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Issue numbers are globally unique across all `.scratch/` PRD directories;
  before creating issues, scan existing `.scratch/**/issues/<NN>-*.md` files
  and use the next unused number
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if
needed), using the next globally unused issue number.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or
the globally unique issue number directly.
