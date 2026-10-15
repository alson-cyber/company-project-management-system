# Product Definition

## Goal

Build an internal project-management system for a software company where developers manage projects and much of the implementation work may eventually be performed by AI agents.

The product should provide the useful structural power of Jira without inheriting Jira's complexity.

## Work hierarchy

The canonical hierarchy is:

```text
Project
  Epic
    User Story
      Task
        Sub-task
```

Every item below Project is an issue/work item with a type. Parent/child relationships are strict.

Allowed relationships:

| Parent | Allowed child |
|---|---|
| Project | Epic |
| Epic | User Story |
| User Story | Task |
| Task | Sub-task |
| Sub-task | none |

A future phase can introduce explicit exceptions, but the base model should remain predictable.

## User Stories

User Stories must represent user value rather than becoming generic task names.

Structured form:

- **As a** — persona / user type
- **I want** — capability / goal
- **So that** — reason / value

The `so that` field is required in the production version because it preserves why the work matters.

## Notes and attachments

Work items, especially User Stories, need rich contextual material that does not disappear into comments.

Use separate concepts:

- **Description** — current canonical explanation of the work.
- **Notes** — supporting decisions, requirements, technical guidance, product thinking, meeting takeaways.
- **Attachments** — files, designs, screenshots, documents, evidence, specifications.
- **Comments** — chronological discussion.
- **Activity** — system-generated audit history.

Do not merge all five into one discussion stream.

## Activity and contributions

Track meaningful actions as persisted events:

- created issue
- changed status
- changed assignee
- changed priority
- changed parent
- changed due date
- added note
- attached file
- commented
- completed issue

Contribution views should show factual participation. Do not create an arbitrary productivity or employee-performance score.

## Roles

Initial roles:

### Member
Works on assigned work and projects they are a member of.

### Project Lead
Manages project structure, assignments and project-level execution.

### Admin
Controls system configuration and user administration.

### Executive
Company-wide visibility, portfolio health, people/contribution overview and master audit log.

Admin and Executive are intentionally separate: administering the system is not the same responsibility as viewing company-wide delivery information.

## Executive / Master experience

The Executive view extends the hierarchy concept upward:

```text
Company
  Project
    Epic
      User Story
        Task
          Sub-task
```

It should answer:

- What projects are active?
- Which projects need attention?
- What changed today?
- What is overdue or high priority?
- Who is contributing and where?
- What decisions or status changes happened?
- Where can management drill down for evidence?

The master activity log is an auditable company-wide feed with filters by project, person, action, issue type and date.

## Product UX principles

1. Structure should be visible, not hidden behind configuration.
2. Users should understand where they are in the hierarchy.
3. Creating the correct child item should take one obvious action.
4. Detail views should preserve context instead of navigating the user away unnecessarily.
5. The system should be useful before introducing sprints, story points or custom workflows.
6. Executive reporting should be drill-down evidence, not decorative analytics.
7. Visible controls should work.
8. Desktop is primary; tablet/mobile should remain usable.
