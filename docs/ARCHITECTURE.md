# Architecture Notes

> **Current production stack** is Next.js App Router, PostgreSQL, Prisma and Better Auth. Details: [`ARCHITECTURE-PLAN.md`](ARCHITECTURE-PLAN.md) and [`ISSUE-DOMAIN.md`](ISSUE-DOMAIN.md). `PRODUCT-RULES.md` wins if this file disagrees.
>
> The Checkpoint 0.5 prototype remains in `prototype/` as a visual reference. Direct AI-agent execution is **Future / Optional — Not Current Scope**.
>
> My Work, Inbox and search are personal surfaces over the same issues. Inbox rows are notifications with read state. Activity remains the append-only history and is never updated when a notification is marked read. In-app only: no email or push. Rules: `PRODUCT-RULES.md` §5.1–§5.2.

## Historical checkpoint (prototype)

The original checkpoint was deliberately dependency-free:

The current checkpoint is deliberately dependency-free:

```text
index.html
styles.css
app.js
```

State is seeded and persisted through browser `localStorage`. This allows the UI, hierarchy and interaction model to be reviewed without committing the production codebase to a framework or database before Cursor inspects the target repository.

## Recommended production stack

If no stronger constraints already exist in the target repository:

- TypeScript strict mode
- Next.js App Router
- PostgreSQL
- Prisma or Drizzle
- Zod at API/server boundaries
- Server-side authorization
- S3-compatible object storage for attachments
- Vitest for domain/unit tests
- Playwright for end-to-end tests

Do not replace an existing good stack merely to match this recommendation.

## Recommended modules

```text
src/
  app/
    (auth)/
    dashboard/
    projects/
    my-work/
    team/
    executive/
    settings/
  components/
    shell/
    hierarchy/
    issues/
    board/
    activity/
    files/
    people/
    ui/
  domain/
    projects/
    issues/
    activity/
    permissions/
    contributions/
  data/
    repositories/
    db/
  server/
    auth/
    services/
```

## Issue model

Prefer one work-item/issue table for Epic, User Story, Task and Sub-task.

Important fields:

```text
id
project_id
issue_number
issue_key
type
parent_id
title
description
status
priority
assignee_id
reporter_id
due_date
created_at
updated_at
```

User Story-specific structured values may be held in a one-to-one `user_story_details` table or strongly validated nullable columns. A one-to-one table keeps the generic issue model cleaner.

## Hierarchy invariants

These checks belong in domain/service code and should also be protected by database-aware validation:

- Epic must not have an issue parent.
- User Story parent must be Epic.
- Task parent must be User Story.
- Sub-task parent must be Task.
- Parent and child must belong to the same Project.
- Parent changes must not create cycles.
- Deleted/archive behavior must preserve auditability.

Do not rely on the frontend to enforce hierarchy.

## Activity event model

Activity should be append-only for normal users.

An event should include:

```text
id
company_id
project_id
issue_id nullable
actor_user_id
action
entity_type
entity_id
before_json nullable
after_json nullable
metadata_json nullable
created_at
```

Use one transaction for a business mutation and its activity event whenever possible.

## Contribution model

Contribution summaries should be queries/materialized aggregates over real facts, not a separate subjective score.

Examples:

- issues created
- issues currently assigned
- issues completed
- comments
- notes
- reviews/approvals later
- recent activity

## Attachments

Production attachment flow:

1. Authorize the user against the target issue/project.
2. Create attachment record.
3. Upload to object storage using controlled upload mechanism.
4. Persist object key, original filename, MIME type, size, uploader and timestamps.
5. Generate activity event.
6. Serve authorized, short-lived download URLs.

Do not store arbitrary public object URLs directly in the issue.

## Authentication and RBAC

Authentication is visual-only in Checkpoint 0.5.

Production authorization must be checked on the server for every mutation and sensitive read. UI visibility is not authorization.

Recommended separation:

- authentication: who is this user?
- project membership: which projects can they access?
- project role: what can they manage inside a project?
- system role: Admin / Executive visibility and actions

## AI-agent future

> **Future / Optional — Not Current Scope.** Do not implement this. Current actor types are `USER` and `SYSTEM` only.

A later agent system, if ever approved, should integrate as a first-class actor rather than pretending agents are human users.

Consider:

```text
Actor = User | Agent | System
```

Agent activity should record:

- agent identity
- triggering user/system
- task/issue
- run identifier
- status
- evidence/log reference
- resulting changes

This should be added after the human project-management foundation is stable.
