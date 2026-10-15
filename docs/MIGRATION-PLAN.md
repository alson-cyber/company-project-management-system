# Migration Plan — Prototype to Production

Status: **in progress** on `feat/core-pms-domain`. Phases 1–5 of this plan (tooling, schema, auth, core issue services, project Issues workspace) are implemented at foundation depth. Notes/comments/attachments, board, timeline, inbox and reports are not. Each phase is a reviewable set of commits on a feature branch; nothing is merged into `main`, pushed or deployed without explicit approval.

Inputs: `CURRENT-STATE.md` (what exists), `PRODUCT-RULES.md` (binding rules), `ARCHITECTURE-PLAN.md` (target design).

## 1. Strategy

- **Rebuild the code, preserve the product.** The prototype's single-file, `innerHTML`-based code is not extended (see `CURRENT-STATE.md` §10). Its information architecture, interaction patterns, copy tone and design tokens are re-implemented faithfully in the new stack.
- **Backend-first, vertical slices after.** Domain rules, schema, auth and the activity pipeline are built and tested before screens, because every screen depends on them and they are where the prototype is weakest.
- **Keep the prototype runnable as a reference** until the production app reaches parity, then remove it only with explicit approval.
- **No data migration.** The prototype's `localStorage` contains demo data only. Production starts with an empty database plus a development seed rewritten from the prototype's seed (with hierarchy violations and positional keys fixed).
- **Every visible control works.** Nav items for features not yet built (Inbox, Reports, Timeline) are hidden until their phase.

## 2. Prototype-to-production mapping

| Prototype element | Fate | Production home |
|---|---|---|
| `styles.css` tokens (`:root`) | **Port** | `src/app/globals.css` variables → Tailwind theme |
| Sidebar, topbar, breadcrumb | **Re-implement** | `components/shell/` |
| Project hero + tabs | **Re-implement** | `app/(app)/projects/[projectKey]/layout.tsx` |
| `renderTree` / `treeNode` | **Re-implement** (ARIA tree, keyboard) | `components/hierarchy/` |
| `renderDetail` + tabs | **Re-implement** (URL-driven, editable fields) | `components/inspector/` |
| Story block + parent story context | **Re-implement**, add acceptance criteria, resolve story for Sub-tasks | `components/inspector/story-*` |
| `issueModal` / `createIssue` | **Replace** (server-validated, no fabricated defaults, no top-level Task/Sub-task) | `modules/issues/issues.service.ts` + dialog |
| `allowedChildren` | **Port as domain rule** | `modules/issues/hierarchy.rules.ts` |
| Key generation | **Replace** (atomic sequence) | `issues.service.create` |
| `addNote` / `addComment` / `attachFiles` | **Replace** | `modules/collaboration`, `modules/attachments` |
| `addActivity` | **Replace** (structured, transactional) | `modules/activity` |
| Board + `bindBoardDnD` | **Re-implement** with dnd-kit, persisted, optimistic | `components/board/` |
| `contributionFor` | **Replace** (event-based, time-windowed, no ranking bars) | `modules/reporting/contributions` |
| Executive view, master log, CSV export | **Re-implement** (real filters, server export with formula-injection escaping, audited) | `app/(app)/executive`, `api/exports` |
| Project/issue `progress` numbers, health thresholds | **Remove** | Derived progress; Lead-set health label |
| Login screen layout | **Keep visual**, replace behaviour | `app/(auth)/sign-in` |
| Timeline, Inbox, Reports, search, filters, bell | **Do not port now** | Later phases |
| `data/schema.sql` | **Supersede** by Prisma schema; keep file until Phase 2 lands | `prisma/schema.prisma` |

## 3. Phases

### Phase 0 — Audit (this change)
- Deliverables: `CURRENT-STATE.md`, `PRODUCT-RULES.md`, `ARCHITECTURE-PLAN.md`, `MIGRATION-PLAN.md`.
- Exit: product owner reviews, answers the open decisions in `ARCHITECTURE-PLAN.md` §10, and confirms `PRODUCT-RULES.md` §10 defaults.

### Phase 1 — Foundation and tooling
- Move the prototype to `prototype/` with `git mv` (still runnable with `python3 -m http.server` from that folder).
- Scaffold Next.js App Router + TypeScript strict at the repository root with pnpm.
- ESLint (with module-boundary import rules), Prettier, Vitest, Playwright, Zod-validated `env`.
- `docker-compose.yml` for PostgreSQL and MinIO for local development.
- GitHub Actions: install, typecheck, lint, unit tests.
- Exit: `pnpm dev` serves an empty authenticated-shell placeholder; CI is green; prototype still runs.

### Phase 2 — Schema, migrations, domain rules
- Prisma schema per `ARCHITECTURE-PLAN.md` §4; first migration includes hierarchy trigger, `CHECK` constraints and append-only trigger on `activity_event`.
- Pure domain modules: `hierarchy.rules`, story validation, key formatting, progress derivation, `computeChanges`.
- Development seed rewritten from the prototype data: orphan Tasks in SignVeli, AIB Portal and Internal PMS get proper Epic → Story parents; flat keys; no progress numbers; no "agent orchestration" wording.
- Integration test harness against a real Postgres (CI service container).
- Exit: domain unit tests and database-constraint integration tests pass (tests 6, 7 below at the DB level).

### Phase 3 — Authentication, users, authorization
- Auth library with database sessions; OIDC provider per decision; local development sign-in.
- `SystemRoleGrant`, `ProjectMember` roles, `AuthContext` loader, `access` policies and scoped query helpers.
- Role-based landing after sign-in.
- Exit: tests 14 and 16 below pass at the service level; an unauthenticated request to any app route redirects to sign-in.

### Phase 4 — Core services with activity
- Project service: create (Admin), edit, members, lead (Lead).
- Issue service: create (all four types), edit fields (title, description, status, priority, assignee, due date, parent, type, story fields), archive/restore, with version checks and activity.
- Acceptance criteria service.
- Exit: tests 1–5, 8, 9, 13 pass as integration tests.

### Phase 5 — App shell and project workspace
- Shell (sidebar, topbar, responsive navigation), Projects list, project layout and tabs.
- Issues tab: hierarchy tree + inspector, create-child flow, inline field editing, URL-driven selection.
- Project Overview with derived progress and factual attention counts.
- Exit: Playwright covers creating the full Project → Sub-task chain through the UI and reload persistence (test 17).

### Phase 6 — Notes, comments, attachments
- Notes with categories and revisions; comments with edit/soft delete.
- Storage abstraction (local + S3 drivers), upload/download routes, Files tab.
- Exit: tests 10, 11, 12 pass (integration + one Playwright upload/download).

### Phase 7 — Board and My Work
- dnd-kit board for Tasks/Sub-tasks with keyboard moves, optimistic status change, persisted ordering.
- My Work with real filters (assigned, in progress, due soon, completed, recently updated).
- Exit: test 18 and a My Work authorization test pass.

### Phase 8 — Activity views, Team, Executive
- Issue, project and company activity views rendered from structured events.
- Team and project Team tabs with event-based, time-windowed contribution evidence (no ranking).
- Executive overview: portfolio facts, Lead-set health labels, master log with filters (project, person, action, issue type, date), drill-down, audited CSV export.
- Exit: test 15 passes; Executive cannot reach Admin functions; Member cannot reach Executive routes or data.

### Phase 9 — Admin
- User invitation/deactivation, system role grants/revocations, project creation/archival — all audited.
- Exit: role-grant audit events visible to Admin; deactivated user's sessions are revoked.

### Phase 10 — Hardening and parity sign-off
- Accessibility pass (keyboard, screen reader labels, contrast, text size), responsive pass, error/empty/loading states, security headers and CSP, rate limiting on auth and upload, backup/restore notes, seed-free production bootstrap (first Admin).
- Product owner compares against the prototype for parity of preserved patterns.
- Exit: full test suite green in CI; parity sign-off; separate approval requested to remove `prototype/`.

### Later (not scheduled)
Timeline (with real start/due dates), Inbox and notifications, Reports, global search and command palette, comment-to-note promotion, saved filters. AI-agent execution remains out of scope unless a new decision is recorded in `PRODUCT-RULES.md`.

## 4. Required tests (acceptance baseline)

Carried from `CURSOR-HANDOFF.md`, mapped to phases:

| # | Test | Level | Phase |
|---|---|---|---|
| 1 | Create Project | integration | 4 |
| 2 | Create Epic | integration | 4 |
| 3 | Create User Story under Epic (story fields required) | integration | 4 |
| 4 | Create Task under User Story | integration | 4 |
| 5 | Create Sub-task under Task | integration | 4 |
| 6 | Reject invalid hierarchy (incl. top-level Task/Sub-task, invalid type change) | unit + DB | 2, 4 |
| 7 | Reject cross-project parent | unit + DB | 2, 4 |
| 8 | Update status (+ completed/reopened events) | integration | 4 |
| 9 | Assign user (must be a project member) | integration | 4 |
| 10 | Add note (+ revision on edit) | integration | 6 |
| 11 | Add comment | integration | 6 |
| 12 | Attach file metadata and object; authorized download; unauthorized download denied | integration + e2e | 6 |
| 13 | Activity event persisted for each meaningful mutation; none for no-ops; none on failure | integration | 4 |
| 14 | My Work returns only authorized assigned work | integration | 3, 7 |
| 15 | Executive can see cross-project activity | integration | 8 |
| 16 | Member cannot access unauthorized project or Executive data (returns 404) | integration + e2e | 3, 8 |
| 17 | Reload preserves all data | e2e | 5 |
| 18 | Board status movement persists | e2e | 7 |

Additional tests introduced by this audit:

- Issue numbers are unique and gap-tolerant under concurrent creation.
- Concurrent edit with a stale `version` is rejected, not silently overwritten.
- Activity rows cannot be updated or deleted by the application database role.
- Executive cannot grant roles or create/archive projects; Admin cannot read contribution reports.
- Completion credit stays with the assignee-at-completion after reassignment.
- CSV export escapes formula-leading values.

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Identity provider undecided | Blocks Phase 3 production auth | Build against OIDC abstraction; local dev sign-in until decided |
| Hosting/storage undecided | Blocks deployment, not development | Storage interface + MinIO locally; Docker image is host-neutral |
| Visual drift from the prototype during rebuild | Loses the approved feel | Port tokens first; keep `prototype/` runnable for side-by-side review until Phase 10 |
| Scope creep into Timeline/Reports/AI | Delays core | Explicit "Later" list; hidden nav until built |
| Prisma cannot express triggers/privileges | Invariants only in app code | Raw SQL inside Prisma migrations, covered by DB integration tests |
| Hierarchy strictness frustrates real usage (e.g. a quick bug Task without a story) | Pressure to allow orphans | Keep strict; record any exception as a product rule first (`PRODUCT-RULES.md` §1.1) |
| Contribution views misread as performance ranking | Trust and HR risk | Rules in `PRODUCT-RULES.md` §6; review copy and ordering with the product owner |
