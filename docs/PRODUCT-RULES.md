# Product Rules

These rules are binding for the production system. Where `PRODUCT.md`, `ARCHITECTURE.md`, `CURSOR-HANDOFF.md`, the README or the prototype disagree with this document, this document wins.

Rules marked **[server-enforced]** must be enforced by server-side domain code. Client-side checks are for convenience only and never count as enforcement.

---

## 1. Work hierarchy

```text
Project
└── Epic
    └── User Story
        └── Task
            └── Sub-task
```

- A **Project** is a container, not an issue. It has its own key, members, lead and settings.
- **Epic, User Story, Task and Sub-task** are issues (work items) of a fixed `type`, stored in one issue model.
- Every issue belongs to exactly one Project.

### 1.1 Legal parent/child relationships [server-enforced]

| Issue type | Required parent | Allowed children |
|---|---|---|
| Epic | the Project itself (no issue parent) | User Story |
| User Story | an Epic | Task |
| Task | a User Story | Sub-task |
| Sub-task | a Task | none |

Consequences:

1. An Epic must have no issue parent.
2. A User Story, Task or Sub-task **must** have a parent of exactly the type above. There are no orphan Tasks or Sub-tasks.
3. Parent and child must belong to the same Project.
4. Because each type may only sit directly below the type above it, depth is fixed and cycles are structurally impossible — provided rules 5 and 6 are also enforced.
5. Changing an issue's **parent** is allowed only to another valid parent of the required type in the same Project.
6. Changing an issue's **type** is allowed only if the new type is valid for its current parent **and** for all its current children. Otherwise the change is rejected; the system does not silently re-parent or orphan anything.
7. Moving an issue to a different Project is not supported in the first production release. If added later it must move the whole subtree and re-key it with an audit trail.
8. Archiving an issue that has non-archived children is rejected unless the children are archived in the same operation.

Any future exception to these rules (for example, a Task directly under an Epic) must be an explicit, per-project configuration recorded in this document first — not an accident of the data model.

### 1.2 Issue identity [server-enforced]

- Each Project has an immutable short **key** (for example `AQUA`). Uppercase letters and digits, starting with a letter, 2–10 characters.
- Each issue gets a **project-local sequence number** allocated atomically when it is created. Its display key is `<PROJECTKEY>-<number>` (for example `AQUA-42`).
- Keys are **flat**. They never encode hierarchy position (no `AQUA-111-1`), never derive from the title, and are never reused, even after archive.
- Internal identity is an opaque ID (UUID); the key is the human-facing identifier.

### 1.3 Statuses and priorities (baseline)

- Statuses: `To Do`, `In Progress`, `In Review`, `Done`. An issue is **complete** when its status is `Done`. Leaving `Done` is a **reopen**.
- Priorities: `Lowest`, `Low`, `Medium`, `High`, `Highest`.
- "High priority" in any report means `High` **or** `Highest`. One definition, used everywhere.
- "Overdue" means a due date before today (in the company's configured time zone) and status not `Done`. Priority is not part of the definition.
- Custom workflows, sprints and story points are out of scope for the first production release.

### 1.4 Progress and health

- Progress is **derived**, never typed in. There is no `progress` column.
- **Executable work** is every non-archived Sub-task, plus every non-archived Task that has no non-archived Sub-task children.
- Epics and User Stories are containers: they never count as executable units. A Task that has Sub-tasks is also a container for progress, so a Task and its Sub-tasks are never double-counted.
- Progress of a parent issue or of a Project is `Done executable descendants / all non-archived executable descendants`. If there is no executable work, progress is 0%.
- Task **status** is independent of Sub-task status. Completing every Sub-task does not move the Task to Done. Parent status is never auto-changed when children change.
- No status-to-percentage mapping (for example "In Review = 85 %").
- Project health is shown as **facts** (overdue count, open high-priority count, items with no assignee, last activity date, target date). A qualitative label (Healthy / Attention / At Risk / Blocked) may only be set **by a person** (the Project Lead) and must be logged with who set it and when. The system does not invent health labels from thresholds.

### 1.5 Archiving

- Issued work is **soft-deleted** (`archivedAt`). Activity and issue numbers survive. Numbers are never reused.
- Archiving an issue that has non-archived children is rejected unless the children are archived in the same operation (`includeDescendants`).
- Restoring an issue whose parent is still archived is rejected; restore the parent first.
- Restoring a parent does not automatically restore archived children.
- Hard-delete of issues is not a normal application operation.

## 2. User Stories

A User Story describes functionality **from the user's perspective**. It is not a generic task with a different icon.

### 2.1 Structure [server-enforced]

| Field | Required | Meaning |
|---|---|---|
| Title | yes | Short name used in lists, e.g. "Streamline guest booking flow". |
| **As a** | yes | The user or persona, e.g. "resort guest". |
| **I want** | yes | The goal or capability, e.g. "to book activities through a simple flow". |
| **So that** | yes | The reason or value, e.g. "I can reserve excursions without manual requests". |
| Description | no | Current canonical explanation and context. |
| Acceptance criteria | strongly expected | Ordered list of individually testable statements. |

- All three story fields are required and must be non-blank after trimming. The system **never fills them with default text**.
- Acceptance criteria are stored as **individual ordered items**, not one text blob, so they can be added, reordered, edited and marked as met, each change being auditable.
- A User Story with no acceptance criteria is allowed but must be visibly flagged as incomplete in its inspector.

### 2.2 What a User Story supports

Description, acceptance criteria, notes, attachments, comments, activity history, and child Tasks.

### 2.3 Context inheritance

Tasks and Sub-tasks display their governing User Story (`As a / I want / So that` and acceptance criteria) read-only in their inspector, with a link to open it. A Sub-task resolves the story through its parent Task.

## 3. Description, Notes, Comments, Attachments, Activity

These are five separate concepts and must never be merged into one stream.

| Concept | What it is | Who writes it | Mutability |
|---|---|---|---|
| **Description** | The current canonical explanation of the work. | Anyone who may edit the issue. | Editable; each edit is an activity event. |
| **Notes** | Durable supporting context: decisions, requirements, technical guidance, product thinking, meeting takeaways. | Project members. | Editable by author (and Project Lead); revisions kept. |
| **Comments** | Chronological discussion and questions. | Project members. | Author may edit (marked "edited") or delete (soft delete, leaves a placeholder). |
| **Attachments** | Files: designs, screenshots, documents, specifications, evidence. | Project members. | Can be removed (soft delete); the record and activity remain. |
| **Activity** | System-generated audit history. | The system only. | Never edited or deleted by users. |

### 3.1 Notes vs Comments

- A **note** has a **title**, a **category** (initial set: Product, Design, Technical, Decision, Requirement, Meeting), a body, an author, and created/updated timestamps. It is meant to be read later by someone who was not in the conversation. Notes are shown as a curated list, newest first, and editing a note keeps its prior revisions.
- A **comment** has no title or category. It is a message in a time-ordered thread. Comments are for back-and-forth; when a discussion reaches a decision, the decision belongs in a note.
- Promoting a comment to a note is a desirable future action; it creates a new note that links to the source comment.

## 4. Attachments

1. Attachments belong to an issue. The project Files view aggregates attachments from all issues the viewer may see.
2. Uploading and downloading require the same authorization as reading/editing the owning issue. **No public, permanent file URLs.** Downloads use short-lived authorized links or a server-streamed route.
3. Each attachment records: original filename, server-detected MIME type, size in bytes, checksum (SHA-256), uploader, upload time, owning issue, and an opaque storage key that is never derived from the filename.
4. Storage is accessed only through a storage abstraction so the backing provider (local disk for development, S3-compatible object storage in production) can change without touching business code.
5. A configurable maximum file size applies (initial default 25 MB) and is checked server-side.
6. A configurable denylist of dangerous types (for example executables) is checked server-side. Files are always served as downloads with the stored MIME type and `Content-Disposition`, never rendered inline from user content without a safe type.
7. An upload is only "attached" once the object is confirmed in storage; incomplete uploads are cleaned up and never shown.
8. Removing an attachment is a soft delete with an activity event. Physical deletion of the object, if ever needed (e.g. legal request), is an Admin operation that is itself audited.

## 5. Activity and audit principles

1. **Activity is produced by business mutations**, inside the same database transaction as the change. It is never reconstructed from current state and never written by the client.
2. If the mutation fails, no activity is written. If activity cannot be written, the mutation fails.
3. **Append-only.** Normal users, Executives and Admins cannot edit or delete activity through the application.
4. **Structured.** Each event records: actor, action (from a fixed list), entity type and ID, project, issue (when applicable), the changed fields with **before and after values**, and a server-generated UTC timestamp. Human-readable sentences are rendered from this at read time.
5. One user action that changes several fields produces one event listing all field changes, not a burst of unrelated rows.
6. No-op saves (nothing actually changed) produce no event.
7. Events must be meaningful to a person reading the history. Logging every keystroke or view is not activity.
8. Activity is readable only by people who may read the underlying project or issue, except that Executives may read all of it (§7).

Minimum events:

| Area | Events |
|---|---|
| Issue | created, title/description edited, status changed, priority changed, assignee changed, parent changed, due date changed, type changed, completed, reopened, archived, restored |
| User Story | story fields edited, acceptance criterion added / edited / removed / reordered / marked met |
| Notes | added, edited, deleted |
| Comments | added, edited, deleted |
| Attachments | added, removed |
| Project | created, edited, archived, member added / removed / role changed, lead changed, health label set |
| System (Admin) | user invited / deactivated, system role granted / revoked |

`completed` is recorded whenever status moves into `Done` (in addition to the status change), and `reopened` whenever it moves out of `Done`.

### 5.1 Activity is not Inbox

- **Activity** is the append-only record of what happened. Marking something read never updates or deletes an activity event.
- **Inbox / notifications** are personal attention for one recipient: unread and read state, with a stable historical notice even if the issue later changes.
- Notifications are created on the server, in the same transaction as the change when the change itself is the reason (assignment, comment, note, status, membership). Due soon and overdue notices are materialised from issue dates when a personal surface loads. The same recipient, type and dedupe key is inserted once.
- A person is not notified about their own action. Assigning an issue to the person who already holds it does not create another assignment notice.
- In-app only. Email, push, Slack and Teams are out of scope.
- Direct AI-agent execution remains **Future / Optional — Not Current Scope** (§8).

### 5.2 Personal attention rules

These rules are shared by My Work, Inbox and the Dashboard. They are not stored as a second status.

| Rule | Definition |
|---|---|
| Overdue | Due date is before today in `COMPANY_TIMEZONE`, status is not Done, issue is not archived. Priority is irrelevant (§1.3). |
| Due soon | Open, not archived, due date is today or at most 7 calendar days later in `COMPANY_TIMEZONE`. Overdue work is not also due soon. |
| Completed recently | `completedById` is the viewer and `completedAt` falls within the last 14 calendar days, inclusive. The current assignee is irrelevant. |
| Recently updated | Open work assigned to the viewer whose `updatedAt` falls within the last 14 calendar days. |

Project Overview's "due in the next 14 days" list is a project planning horizon. It is not the personal due-soon rule.

Inbox relevance, and only these:

- assigned to me
- comment or note on an issue currently assigned to me
- status change on work already assigned to me (a brand-new assignment does not also emit a status notice)
- due soon or overdue on work assigned to me
- I was added to a project or made its lead

Priority edits, description edits, labels, criteria, attachments and health changes do not create inbox items.

## 6. Contribution-reporting principles

Contribution reporting shows **factual evidence of work**. It is not a performance evaluation.

1. Every number is a **count of real recorded events or records** over a stated time window (for example "issues completed while assigned, last 30 days"), and every number is clickable to the underlying list of issues/events.
2. Completion credit is taken from the activity history (who was the assignee when it moved to `Done`, and who moved it), not from the current assignee, so later reassignment does not move credit.
3. **No composite scores, no productivity indices, no performance ratings, no "top performer" rankings.** The system does not combine counts into a single number per person.
4. Do not present people in a ranked order by activity volume by default. Default ordering is alphabetical or by project role.
5. Visualisations must not imply that more events means better work (avoid bars normalised to "the top person").
6. Counts carry context: e.g. assigned vs completed vs currently open, comments and notes written, files attached, issues created.
7. The UI states plainly that these are activity signals and do not measure quality, difficulty, or value.
8. Individual drill-down shows the person's recent activity as evidence, scoped to what the viewer may see.

## 7. Roles: Executive vs Admin

Authentication answers *who you are*. Authorization combines **system roles** (company-wide) with **project membership roles** (per project). System roles are independent grants: a user may hold none, one, or several.

| Role | Scope | Purpose |
|---|---|---|
| Member | Projects they belong to | Work on issues: create, edit, comment, note, attach within member projects. |
| Project Lead | One project | Manage that project's structure, members, assignments, settings and health label. |
| **Executive** | Company-wide | **Visibility**: read every project, issue, note, comment, attachment and all activity; portfolio health; contribution evidence; master activity log; exports. |
| **Admin** | System | **Configuration**: users, system roles, project creation/archival, global settings. |

Key distinctions:

- **Executive does not imply Admin.** An Executive cannot manage users, grant roles, change system configuration, or perform destructive operations (archive projects, purge files) by virtue of being an Executive.
- **Executive is read-oriented.** An Executive may comment or add notes only in projects where they are also a member. Company-wide visibility does not grant company-wide write access.
- **Admin does not imply Executive.** Admin access to configuration does not automatically grant access to project content or contribution reports. (Admins see project metadata needed to administer, e.g. names, keys, members.)
- A person who needs both must be granted both explicitly. Every grant and revocation is audited.
- Role is never inferred from an email address or job title. Job title (Engineer, Designer, QA Engineer…) is a display field with no permission meaning.
- Hiding a control in the UI is not authorization. Every read of protected data and every mutation is checked on the server.
- Global search uses the same project visibility: members see their projects, Executives see company project content, Admins do not gain project content by being Admins. User email is returned only to Admins. My Work and Inbox are limited to the signed-in user and to projects they may view.
- Executive exports of activity or contribution data are themselves recorded as audit events.

Landing after sign-in: Executive → Executive overview; Admin with no project memberships → Admin settings; everyone else → My Work.

## 8. Scope exclusion: direct AI execution

**Direct AI-agent execution through the PMS is not part of the current scope.**

- Do not implement agent orchestration, agent runners, agent identities, agent queues, or agent-triggered mutations.
- Do not shape the present data model, permissions, or UI around AI execution (no `Agent` actor type, no agent run tables, no "assign to agent" fields).
- The only actor types in the current system are **User** and **System** (for scheduled or automatic changes such as migration back-fills).
- This may be reconsidered in a future phase as a separate decision recorded here. Keeping activity structured and actor-attributed is sufficient groundwork; nothing more is to be built for it now.

## 9. UX principles (carried forward from the prototype)

1. The hierarchy is visible, not hidden behind configuration.
2. Users always know where they are: project, parent chain, and issue key are on screen.
3. Creating the correct child is one obvious action with the type pre-selected.
4. The issue inspector preserves context instead of navigating away.
5. Executive reporting is drill-down evidence, not decorative analytics.
6. **Every visible control works.** Controls that are not implemented are not shown.
7. Desktop is primary; tablet and mobile must remain usable, including navigation.
8. Visual target: Linear-level refinement, Notion-level calm and clarity, Jira-level project-management depth — not a generic admin dashboard of oversized cards.

## 10. Defaults pending product-owner confirmation

The following were chosen during the audit as sensible defaults. They are binding until changed, but should be confirmed before the related phase is built:

| Default | Section |
|---|---|
| Executives can write (comment, note) only in projects where they are members. | §7 |
| Admins do not automatically see project content or contribution reports. | §7 |
| Health labels are set by the Project Lead, never computed. | §1.4 |
| Acceptance criteria items can be marked "met". | §2.1 |
| Note categories: Product, Design, Technical, Decision, Requirement, Meeting. | §3.1 |
| Maximum attachment size 25 MB. | §4 |
| Cross-project issue moves are not supported initially. | §1.1 |
| Project keys are immutable. | §1.2 |
