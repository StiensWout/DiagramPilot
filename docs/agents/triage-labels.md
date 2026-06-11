# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the Linear statuses used by the DiagramPilot team.

| Label in mattpocock/skills | Linear status     | Meaning                                  |
| -------------------------- | ----------------- | ---------------------------------------- |
| `needs-triage`             | `Backlog`         | Maintainer needs to evaluate this issue  |
| `needs-info`               | `Needs Info`      | Waiting on reporter for more information |
| `ready-for-agent`          | `Ready For Agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `Todo`            | Requires human implementation            |
| `wontfix`                  | `Canceled`        | Will not be actioned                     |

When a skill mentions a role, use the corresponding status string from this table.

Delivery work can then move through `In Progress`, `In Review`, and `Done`.
Use `Duplicate` only when Linear should mark an issue as a duplicate.
