# Current State Audit — Checkpoint 0.5 Starter

> Historical. This audit describes the original browser prototype on 2026-10-15. The running product is the Next.js application in the repository root. Use the README, `PRODUCT-RULES.md` and `SECURITY.md` for what exists now.

Audit date: 2026-10-15
Branch audited: `feat/production-foundation` (identical to `main` at commit `1d8d5f6 chore: initialize company project management system`)
Scope: every file in the repository was read. The prototype was served locally and loaded in a browser to confirm runtime behaviour.

This document describes what exists **today**. It does not propose changes; see `ARCHITECTURE-PLAN.md` and `MIGRATION-PLAN.md` for that, and `PRODUCT-RULES.md` for the binding product rules.

---

## 1. What exists

### Repository inventory

| File | Size | Purpose |
|---|---|---|
| `index.html` | 15 lines | Empty `#app` mount point, loads `styles.css` and `app.js`. |
| `app.js` | 500 lines, ~61 KB | The entire application: seed data, state, rendering, event binding, mutations. |
| `styles.css` | 349 lines, ~27 KB | Hand-written CSS with design tokens in `:root` and three responsive breakpoints. |
| `data/schema.sql` | 122 lines | Reference PostgreSQL schema. **Not used by anything**; no migrations, no database. |
| `README.md` | Run instructions, feature list, limitations. |
| `docs/PRODUCT.md` | Product definition (hierarchy, roles, notes vs comments, executive view). |
| `docs/ARCHITECTURE.md` | Recommended stack, module layout, invariants, activity model. |
| `docs/CURSOR-HANDOFF.md` | Instructions and required tests for "Production Checkpoint 1". |
| `.gitignore` | Node/env ignores. |

There is **no** `package.json`, no build system, no framework, no dependencies, no tests, no CI, no linting, no TypeScript, no backend, no database, no authentication, and no deployment configuration.

### Runtime architecture

- A dependency-free single-page application. Run with `python3 -m http.server 4173`.
- One global mutable `state` object (`issues`, `notes`, `comments`, `attachments`, `activity`) loaded from and saved to `localStorage` (`app.js:93-107`).
- `users` and `projects` are **hardcoded constants**, not part of persisted state (`app.js:3-16`).
- One global `ui` object for navigation/selection/modal state (`app.js:76-88`). Nothing in `ui` is persisted or reflected in the URL (except initial read of `?demo=1`, `?page=`, `?tab=`).
- Rendering is string-template HTML assigned to `#app.innerHTML` on **every** interaction, followed by re-binding all event listeners (`render()` at `app.js:168-171`, `bind()` at `app.js:424-441`).
- HTML escaping is done by a hand-written `esc()` helper (`app.js:112`). It is applied consistently to user-entered text; some constant-derived values (issue keys, project colours) are interpolated unescaped.

---

## 2. What is functional (works end-to-end in the browser)

"Functional" here means a real interaction mutates state, persists to `localStorage`, and survives reload. None of it is multi-user or server-backed.

| Feature | Evidence | Notes |
|---|---|---|
| Hierarchy tree render with expand/collapse | `renderTree`/`treeNode` `app.js:304-312` | Recursive render by `parentId`. Collapse state is in-memory only. |
| Create child from a parent (tree `+`, detail "Add …" button) | `data-add-child` handler `app.js:432`; `createIssue` `app.js:451-467` | Child type restricted by `allowedChildren` (`app.js:68-73`). Same-project check on submit. |
| Create top-level issue (topbar "New", "Add issue") | `issueModal` `app.js:413-418` | **Allows any type at the top level**, including Task and Sub-task (see §9). |
| User Story `As a / I want / So that` fields on create | `app.js:417, 462` | Shown only when type is User Story. Empty fields are silently filled with fabricated defaults. |
| Issue detail inspector with tabs (Details, Notes, Attachments, Comments, Activity, Subtasks) | `renderDetail` `app.js:315-321` | Tab counts are live. |
| Parent User Story context shown on a Task | `renderIssueDetails` `app.js:334` | Only the direct parent. A Sub-task does not show its grandparent story. |
| Add note (title, category, body) | `addNote` `app.js:468-471` | Writes an activity entry. No edit/delete. |
| Add comment | `addComment` `app.js:473-476` | Writes an activity entry. No edit/delete. |
| Attach file(s) | `attachFiles` `app.js:477-481` | **Metadata only** (name, formatted size, type label). File contents are discarded. |
| Kanban board, drag and drop between status columns | `bindBoardDnD` `app.js:485-492` | Only Task and Sub-task appear on the board (`app.js:359`). Writes a `changed status` activity entry. |
| Activity entries on create/note/comment/attach/status move | `addActivity` `app.js:483` | Free-text action and pre-formatted detail string. |
| Project Files tab (attachments aggregated across issues) | `renderFiles` `app.js:369-372` | Click opens the owning issue. |
| My Work (issues assigned to `u1`) | `renderMyWork` `app.js:376-379` | Always user `u1`, regardless of who "signed in". |
| Team contributions (created / done / assigned / logged actions) | `contributionFor` `app.js:381-389` | Computed from current state, not history (see §7). |
| Executive dashboard, project health, master activity log | `renderExecutive` `app.js:396-399` | Counts are live; health labels are derived from hardcoded progress (see §3). |
| Master activity CSV export | `exportActivity` `app.js:494-498` | Client-side Blob download. |
| Drill-down navigation | `data-project`, `data-open-issue` handlers `app.js:428-430` | Clicking an issue anywhere jumps into the project Issues tab with the inspector open. |
| Toast feedback | `toast` `app.js:422` | |

## 3. What is visual / demo-only

These controls render but do nothing, or show values that are hardcoded or fabricated.

**Inert controls (no handler at all):**
- Sidebar and topbar search, `⌘ K` hint.
- Notifications bell; Inbox badge is the literal `3`.
- Issues toolbar: search input, `List` view toggle, `Type ▾`, `Status ▾`, `Assignee ▾`.
- Board toolbar: search, `Type ▾`, `Assignee ▾`, `Priority ▾`.
- Projects page: search and the `All / Active / Planning / Completed` filters.
- Timeline toolbar: `Month`, `Oct 2026`, `Today`.
- `Edit project` button and the project `⋯` button; detail-panel `⋯`; attachment-row `⋯`.
- Team: `Invite member`, `Last 30 days ▾`.
- Executive: `All projects ▾`, master log `Project ▾` / `Person ▾` filters.
- Login: `Keep me signed in`, `Forgot password?`.
- Profile menu in the sidebar.

**Placeholder behaviour:**
- `Edit` on Description shows a toast saying editing is deferred (`app.js:448`). **There is no way to edit any issue field after creation** except status via the board.
- `New Project` opens an explanatory modal; projects cannot be created (`app.js:420`).
- Login accepts anything; an email containing `executive` sets `ui.role = 'Executive'`, otherwise `Member` (`app.js:425`). The role is **only displayed** in the sidebar; no screen or action checks it.
- `?demo=1` skips login entirely (`app.js:77`).

**Fake or fabricated data:**
- Project `progress` (68, 61, 89, 42) is a hardcoded number unrelated to issue state.
- Issue `progress` is a hardcoded number; the board overwrites it with 0/50/85/100 by status (`app.js:490`).
- Executive health labels (`At risk` < 50 %, `Attention` < 70 %, `Healthy`) are derived from the hardcoded project progress — an invented judgement (`app.js:398`).
- Executive "Management attention" card includes the hardcoded sentence "Internal PMS is still in planning — 42% progress".
- Dashboard greeting "Good morning, Alson", stat footers ("2 moving quickly", "3 need attention"), and "Cyber Security Maldives" in the profile are literals.
- Timeline bars are positioned by array index (`left: 8+(idx%5)*8 %`) and sized by progress; the "Today" line is fixed at 56 % (`app.js:365-367`, `styles.css:234`). It conveys no schedule information.
- Inbox is a copy of the first 8 activity entries (`app.js:402`).
- Reports is four counters plus an "intentionally lightweight" notice (`app.js:403`).
- All timestamps are display strings ("2 days ago", "Oct 20, 2026"); every new entry is stamped with the literal `'Just now'` forever (`dateNow` `app.js:113`).

## 4. Browser-only persistence

- Single key `workhub-checkpoint-05` in `localStorage` (`app.js:1`).
- Persisted: `issues`, `notes`, `comments`, `attachments`, `activity`.
- **Not** persisted: users, projects, signed-in state, current role, navigation, collapse state.
- `loadState()` accepts any stored object that has an `issues` property; there is no schema version, no migration, and no validation (`app.js:93-105`). Seed changes never reach a browser that already has saved state.
- `persist()` has no error handling for quota or serialization failures.
- Data is per-browser and per-origin: no sharing, no concurrency, no backup. There is **no real data to migrate** from the prototype; it is demo state only.
- Attachment file contents are never stored anywhere.
- No `sessionStorage`, IndexedDB, cookies or service workers are used. The only other browser-only mechanisms are `Blob` + `URL.createObjectURL` for CSV export and the `File` API for reading attachment names and sizes.

## 5. How the hierarchy currently works

- All work items live in one flat `state.issues` array with `type` ∈ {`Epic`, `User Story`, `Task`, `Sub-task`} and a nullable `parentId`.
- Projects are a separate constant array; issues reference them via `projectId`. **Project is not a node in the issue tree.**
- `allowedChildren` (`app.js:68-73`) encodes Epic → User Story → Task → Sub-task → none. It is consulted:
  - to decide whether the `+` / "Add …" button creates a child and which type is pre-selected,
  - to restrict the Type dropdown in the child-create modal,
  - on submit, to reject a mismatched type or cross-project parent (`app.js:456-457`).
- It is **not** consulted for top-level creation. The top-level Type dropdown offers all four types (`app.js:415`), so a parentless Task or Sub-task can be created.
- The seed data already violates the rule: `SV-82`, `SV-91`, `AIB-12` and `PMS-7` are top-level Tasks with `parentId: null` (`app.js:36-39`).
- The tree renders "roots" as any issue with no parent (`app.js:305`), so orphan Tasks render at the same level as Epics.
- Parent changes are impossible (no edit), so cycles cannot currently occur, but nothing prevents them.
- Issue keys:
  - Seeds use hierarchical keys (`AQUA-1`, `AQUA-11`, `AQUA-111`, `AQUA-111-1`) that encode tree position.
  - New keys are `${projectKey}-${100 + countOfIssuesInProject + 1}` (`app.js:459-461`). This is count-based and **can collide** with seeded keys (for example, the 111th AQUA issue would become `AQUA-211`, which already exists).
- The detail tab labelled "Subtasks" actually lists children of any type (an Epic's tab lists its User Stories).

## 6. How issue creation and editing currently work

**Creation** (`issueModal` + `createIssue`, `app.js:413-467`):
- Fields: Type, Project, Title (HTML `required`), Description, Assignee (defaults to the first user), Priority (default Medium), and the three story fields for User Stories.
- Not captured: due date (always `'—'`), reporter (always `u1`), status (always `To Do`), acceptance criteria.
- Empty story fields are replaced with fabricated text: `as a "user"`, `I want <title>`, `so that "the intended outcome is clear"` (`app.js:462`).
- ID is `'local-' + Date.now()`.
- One `created issue` activity entry is added, state is persisted, and the new issue is opened in the inspector.

**Editing:**
- Only status can change, and only by dragging a Task/Sub-task card on the board.
- Title, description, assignee, priority, due date, parent, type and story fields are read-only after creation.
- There is no archive or delete.

## 7. Notes, attachments, comments and activity

| Concept | Shape in prototype | Behaviour | Gaps |
|---|---|---|---|
| Description | `issue.description` string | Rendered in Details; not editable. | No rich text, no edit. |
| User Story | `issue.story = { asA, want, soThat }` | Shown in a dedicated block; also shown on child Tasks. | No acceptance criteria. Fabricated defaults. Not editable. |
| Notes | `{ id, issueId, author, created, label, title, body }` | Separate tab; categories Product / Design / Technical / Decision / Discussion. | No edit, delete, or revision history. Author always `u1`. |
| Comments | `{ id, issueId, author, created, body }` | Separate tab, chronological, composer at the bottom. | No edit, delete, mentions, or formatting. |
| Attachments | `{ id, issueId, name, size: '2.4 MB', type: 'PDF', created, author }` | Separate tab; also aggregated in project Files. | No file content, no download, no MIME type, no byte size, no removal. |
| Activity | `{ id, projectId, issueId, actor, action: 'changed status', detail: 'AQUA-111 · To Do → In Progress', time }` | Per-issue tab, per-project tab, dashboard, team, executive master log, CSV export. | Free-text action, pre-rendered detail, no structured before/after, fake timestamps, all actors are `u1`. |

The **concepts are correctly separated** (Description vs Notes vs Attachments vs Comments vs Activity). This separation is the most valuable product decision in the prototype and is carried into `PRODUCT-RULES.md`.

Contribution figures (`contributionFor`, `app.js:381-389`) are computed from **current** state: "created" counts issues where the user is `reporter`, "done" counts issues currently assigned to the user and in Done, "assigned" counts current assignments, and "logged actions" counts activity entries. Reassigning a completed issue silently moves its "done" credit to someone else. The bar is normalised to the team maximum, which reads like a ranking.

## 8. UI and interaction patterns worth preserving

Confirmed visually at desktop width:

- **Dark compact sidebar** with global nav, a project list with coloured key badges, and a profile footer.
- **Sticky translucent top bar** with breadcrumb context and a global "New" action.
- **Project hero + workspace tabs** (Overview, Issues, Board, Timeline, Files, Team, Activity).
- **Hierarchy tree table**: indented rows, type glyph (E / S / T / •) with type colour, key, title, type pill, status, assignee, due date, priority, and an inline "add child" action per row.
- **Split view**: tree on the left, persistent issue inspector on the right; selecting a row never navigates away.
- **Inspector structure**: kicker (project / key), title, badges, then tabs with live counts.
- **Structured User Story block** with `As a / I want / So that` tokens, and inherited story context on child Tasks.
- **"Add <correct child type>" as one obvious action**, with the type pre-selected and constrained.
- **Distinct Notes / Attachments / Comments / Activity tabs.**
- **Board limited to executable work** (Tasks and Sub-tasks).
- **Drill-down from anywhere**: clicking an issue on the dashboard, My Work, Files or an activity row opens it in context.
- **Executive view framed as evidence**: portfolio, counts, master log, contribution facts, export.
- **Team contribution copy** explicitly says "Factual contribution signals, not a performance score".
- **Design tokens** in `styles.css:1-33` (neutral palette, accent `#4f6cf7`, semantic success/warning/danger, type colours purple/teal/blue/gray, 12 px radius, soft shadows).
- **Calm empty states** with a one-line explanation.

## 9. Fragile, duplicated or unsuitable-for-production code

**Correctness bugs**
1. Top-level creation allows Task and Sub-task without a parent; seeds already contain four such orphans.
2. Count-based key generation can collide with existing keys; seeds encode hierarchy in keys.
3. User Story fields are filled with invented text when left blank.
4. Every action is attributed to `u1` and every timestamp is `'Just now'`.
5. "Needs attention" on Project Overview is labelled as overdue-ish but counts open `High` priority only (`app.js:295`); Executive "High priority" ignores `Highest` (`app.js:397`) while the Dashboard includes it (`app.js:249`). Three inconsistent definitions.
6. Dashboard "Assigned to me" count is `slice(0,6).length`, so it caps at 6 (`app.js:247`).
7. **Draft loss**: `toast()` schedules a full `render()` 2.6 s later (`app.js:422`). Anything being typed in a comment box or modal at that moment is wiped, because the DOM is replaced.
8. Board status changes overwrite issue `progress` with arbitrary percentages.
9. Sub-task inspector does not show the governing User Story (only the direct parent is checked).

**Architecture fragility**
- One 500-line file with ~60 render functions that build HTML strings; long single-line templates (several >2 000 characters) are very hard to review or diff.
- Full-DOM re-render on every change loses focus, scroll and input state, and costs more as data grows.
- No routing: browser Back leaves the app; views cannot be deep-linked or shared.
- Global mutable state with ad-hoc mutation in event handlers; no domain layer, no validation layer.
- IDs from `Date.now()` and `Date.now()+Math.random()`.
- Inline `onclick="event.stopPropagation()"` in modals prevents a strict Content-Security-Policy.
- Duplicated logic: status/priority/type maps, "high priority open" filters, the attachment-row markup reused for children lists, and two near-identical activity list renderers (`activityList`, `masterActivity`).
- CSV export does not neutralise spreadsheet formula injection (values beginning with `=`, `+`, `-`, `@`).

**Accessibility and responsive issues**
- Sidebar navigation items and tree rows are clickable `<div>`s: not focusable, not announced as controls (confirmed: the sidebar nav does not appear in the browser accessibility tree).
- HTML5 native drag-and-drop on the board has no keyboard or touch alternative.
- Most UI text is 8–10 px (48 declarations at 9–10 px in `styles.css`), which is below comfortable reading size.
- At ≤ 820 px the sidebar is hidden with **no replacement navigation** (`styles.css:322-325`), and the tree's add-child column is hidden (`styles.css:333`), so mobile users cannot navigate or create children. Confirmed in a 660 px viewport.
- At desktop width, the sticky hierarchy header (`top: var(--topbar)`) overlaps the first tree rows once the page scrolls, and the collapse chevrons render with native button borders.

## 10. What must be replaced rather than extended

| Area | Why it cannot be extended |
|---|---|
| Persistence (`localStorage`, `loadState`, `persist`) | Single-browser, unversioned, unvalidated; must become a server database. |
| Authentication (login form) | Accepts anything; role from email substring. |
| Authorization | Does not exist; role is cosmetic. |
| Rendering engine (`innerHTML` + `bind()`) | Causes draft loss and focus loss; cannot support routing, optimistic updates, or accessible components. |
| Mutation handlers (`createIssue`, `addNote`, …) | Read the DOM directly, attribute to `u1`, and validate only in the client. |
| Activity model | Free-text strings and fake times; needs structured, server-generated, append-only events. |
| Issue key generation | Collides; must be an atomic per-project sequence. |
| Progress and health | Hardcoded numbers; must be derived from real data or set explicitly by a person. |
| Attachments | Metadata-only; needs storage, authorized download, and real MIME/size. |
| Timeline | Fake geometry; needs real start/due dates before it can be rebuilt. |
| Inbox, Reports, notifications, search, filters | Placeholders; rebuild when their data exists. |
| Seed data | Violates hierarchy, uses positional keys, fixed progress. Rewrite as a development seed only. |

The **visual language, information architecture, component patterns and product separations** should be preserved and re-implemented, not discarded.

## 11. What the current documentation says

- `README.md` accurately describes the prototype as a browser-only checkpoint. It overstates "The browser prototype enforces these parent/child rules" — that is only true for child creation, not top-level creation.
- `docs/PRODUCT.md` defines the hierarchy, User Story structure (with `so that` required), the five-way Description/Notes/Attachments/Comments/Activity separation, factual contributions, and Admin vs Executive separation. It also states the goal includes work "eventually performed by AI agents". **That framing is superseded**: direct AI-agent execution is out of current scope (see `PRODUCT-RULES.md`).
- `docs/ARCHITECTURE.md` recommends TypeScript strict, Next.js App Router, PostgreSQL, Prisma or Drizzle, Zod, server-side authorization, S3-compatible storage, Vitest and Playwright, a single issue table plus `user_story_details`, transactional activity events and an append-only log. Its final section designs an `Actor = User | Agent | System` model for AI agents; this is **out of current scope**.
- `docs/CURSOR-HANDOFF.md` lists what to persist, landing behaviour per role, 18 required tests, and a Checkpoint 1 definition of done. It instructs "then implement; do not stop after planning" — **superseded by the current instruction to audit only**. Its test list remains a good acceptance baseline and is carried into `MIGRATION-PLAN.md`.
- The seeded project `Internal PMS` is described as a "project management and agent orchestration platform" (`app.js:15`); this conflicts with current scope.

Where these older documents conflict with `PRODUCT-RULES.md`, `PRODUCT-RULES.md` wins.

## 12. Existing data and schema concepts

**In the prototype (`app.js`):**
- User: `id, name, initials, role, email`. The `role` field mixes a **job title** (Engineer, Designer, QA Engineer) with **permission roles** (Executive, Project Lead).
- Project: `id, key, name, description, status (Active|Planning), progress, color, lead, members[], due`.
- Issue: `id, key, projectId, type, title, description, status, priority, assignee, reporter, parentId, due, progress, story?`.
- Statuses: `To Do`, `In Progress`, `In Review`, `Done`. Priorities: `Lowest`, `Low`, `Medium`, `High`, `Highest`.
- Note, Comment, Attachment, Activity as in §7.

**In `data/schema.sql` (reference only, never executed):**
- Enums: `issue_type`, `issue_status`, `issue_priority`, `system_role` (MEMBER, PROJECT_LEAD, ADMIN, EXECUTIVE).
- Tables: `app_user`, `project` (with `project_key`, `next_issue_number`), `project_member` (with `project_role`), `issue` (with `issue_number`, `issue_key`, `parent_id`, `archived_at`, unique `(project_id, issue_number)`), `user_story_details`, `issue_note`, `issue_comment`, `issue_attachment` (with `object_key`, `mime_type`, `size_bytes`), `activity_event` (with `actor_type`, `before_json`, `after_json`, `metadata_json`) and useful indexes.

**Strengths of the reference schema:** single issue table, per-project sequence counter, attachment object keys instead of URLs, structured activity with before/after JSON, sensible indexes.

**Gaps and problems in the reference schema:**
- No acceptance criteria.
- `system_role` is single-valued and mixes a project-scoped role (`PROJECT_LEAD`) with system roles; a user cannot be both Admin and Executive.
- No job title field, no project colour, no issue ordering/rank, no start date (needed for any real timeline).
- No hierarchy enforcement (comment defers it); no check that a parent is in the same project.
- `ON DELETE CASCADE` from issue to notes/comments/attachments contradicts audit preservation.
- `activity_event.project_id` is `NOT NULL`, so system-level events (user role changes, project creation before membership) have nowhere to go.
- No note revisions, no soft delete on notes/comments/attachments, no attachment checksum or upload status.
- No authentication/session tables.
- No `uuid` defaults and no `updated_at` maintenance.
- `actor_type` defaults to `'USER'` in anticipation of AI agents; fine to keep as `USER | SYSTEM` only.
- `ARCHITECTURE.md` mentions `company_id`, but the schema has no company table. This is a single-company internal tool; multi-tenancy is not needed.
