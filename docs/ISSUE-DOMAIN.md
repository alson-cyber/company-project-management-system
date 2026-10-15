# Issue domain

Implementation notes for Stage 3. Product rules in `PRODUCT-RULES.md` remain authoritative.

## Model

One `issues` table with `type` = `EPIC | USER_STORY | TASK | SUB_TASK`. Display key is `project.key + '-' + issues.number` (for example `AQUA-12`). The key is not stored; project keys are immutable.

## Key generation

`projects.next_issue_number` starts at 1. Each create runs, inside the same transaction as the insert:

```sql
UPDATE projects
SET next_issue_number = next_issue_number + 1
WHERE id = $projectId
RETURNING next_issue_number - 1 AS number;
```

The `UPDATE` locks the project row, so concurrent creates cannot share a number. `UNIQUE (project_id, number)` is the backstop. Archived numbers are not reused because the counter only increases.

## Hierarchy

Legal parents are enforced in `src/modules/issues/issue.rules.ts` and by:

- `CHECK ((type = 'EPIC') = (parent_id IS NULL))`
- trigger `issues_hierarchy` (parent type, same project, type-change vs children)

Cycles of mixed types are structurally impossible when those rules hold. The service still rejects self-parenting and ancestor walks.

## Progress

See `PRODUCT-RULES.md` §1.4 and `src/modules/issues/issue.progress.ts`.

## Status

`TO_DO | IN_PROGRESS | IN_REVIEW | DONE`. Moving into `Done` writes `issue.updated` (status) and `issue.completed` (actor = the user who moved it; `assigneeIdAtCompletion` is snapshotted). Later reassignment does not move that credit. Moving out of `Done` writes `issue.reopened` and clears `completedAt`.

Due dates are calendar `DATE` values (UTC midnight). “Overdue” uses `COMPANY_TIMEZONE` for “today”, not a hard-coded country zone.

## Archive

See `PRODUCT-RULES.md` §1.5. Activity rows are append-only and keep their `issue_id`, so history survives archive.

## Permissions

Issue reads require `project.view` (membership or Executive). Mutations require `project.participate` (membership). Admin without membership cannot read issue content. Executive without membership can read and cannot write.

## Activity

`recordActivity` is called in the same Prisma transaction as the mutation. `activity_events` remains append-only. Assignee changes do not rewrite past events.
