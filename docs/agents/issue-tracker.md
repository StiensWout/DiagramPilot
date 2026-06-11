# Issue Tracker: Linear

Linear is the live planning tracker for DiagramPilot. GitHub Issues are public
intake only and sync into Linear; implementation planning should happen from the
Linear issue.

## Conventions

- Team: `DiagramPilot` (`DP`)
- Project: `DiagramPilot`
- 0.4.0 scope is tracked with the `0.4.0` Linear milestone
- Use Linear identifiers such as `DP-5` in branches, commits, PR titles, and
  status updates
- Use Linear statuses for triage and delivery state; see `triage-labels.md`
- Use the branch name copied from Linear. The configured format is
  `feature/identifier-title`, for example
  `feature/dp-5-set-up-linear-based-agent-workflow-in-the-repo`
- Legacy `.scratch` files may exist until the final 0.4.0 closeout, but do not
  create or update local markdown issues for new work

## When a skill says "publish to the issue tracker"

Create or update a Linear issue in the DiagramPilot team/project. If the work is
part of a planned release, attach it to the relevant Linear milestone. Keep
GitHub Issues for public reports and requests only.

## When a skill says "fetch the relevant ticket"

Read the Linear issue by identifier, for example `DP-5`. Use the issue
description, comments, project documents, and milestone as the source of truth.
