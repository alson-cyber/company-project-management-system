# Production Architecture Plan

Status: **in progress** — the production foundation (tooling, schema, auth, roles, project membership, shell) is implemented. Issue hierarchy is not. Read with `CURRENT-STATE.md` (evidence) and `PRODUCT-RULES.md` (binding rules).

## 1. Constraints found during the audit

- The repository has **no existing framework, package manifest, database, auth or deployment** to integrate with. The production stack is a free choice; nothing existing would be displaced.
- The prototype is ~850 lines of dependency-free HTML/CSS/JS. Its value is the **interaction model, information architecture and visual tokens**, not its code.
- The code is hosted on GitHub (`alson-cyber/company-project-management-system`), so GitHub Actions is the natural CI.
- The local machine has Node 22, pnpm, Docker and `psql`.
- This is a **single-company internal tool**. Multi-tenancy is not needed.
- Expected scale is internal (tens to low hundreds of users, thousands to low hundreds of thousands of issues). A single PostgreSQL instance and a single application deployment are sufficient.

## 2. Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Shape | **Modular monolith**, one deployable Next.js app | Small team, single company, strong consistency needs (mutation + audit in one transaction). Microservices would add distributed-transaction problems for no benefit. |
| Framework | **Next.js (App Router), current stable**, Node.js runtime only | Server Components for authorized reads, Server Actions/Route Handlers for mutations, one codebase. Edge runtime is avoided (Prisma, file streams). |
| Language | **TypeScript strict** (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | The prototype's bugs are largely shape bugs (strings for dates, free-text actions). |
| Database | **PostgreSQL** (16+) | Transactions, `jsonb` for activity diffs, triggers for defence-in-depth invariants, full-text search later. |
| ORM / migrations | **Prisma** with committed SQL migrations | Mature typed client and migration workflow. Hand-written SQL is added inside Prisma migrations for triggers and privileges that Prisma cannot express. |
| Validation | **Zod** at every server boundary (Server Actions, Route Handlers, env) | One schema per input; shared types with forms. |
| Authentication | **Better Auth** (preferred) or Auth.js, with **database sessions**, connected to the company identity provider via **OIDC** | Database sessions are revocable when a user is deactivated. Exact provider depends on the company IdP — see §10. |
| Authorization | Application-level **policy module** checked in every query and service | Centralised `can()` + scoped queries. Postgres row-level security is optional later as defence in depth, not the primary mechanism. |
| File storage | **`ObjectStorage` interface** with a local-disk driver (dev/test) and an S3-compatible driver (production) | Provider-neutral (AWS S3, MinIO, Cloudflare R2, Tigris all speak S3). |
| UI components | **Radix UI primitives** + project-owned components, **Tailwind CSS** with the prototype's tokens as CSS variables | Accessible dialogs, menus, popovers, tabs and focus management out of the box; the prototype's look is reproduced from its tokens rather than generic defaults. |
| Drag and drop | **dnd-kit** | Keyboard and pointer sensors; fixes the prototype's mouse-only HTML5 drag. |
| Tests | **Vitest** (unit + integration against real Postgres), **Playwright** (end-to-end) | Integration tests must hit a real database to prove transactions, constraints and triggers. |
| Package manager / CI | **pnpm**, **GitHub Actions** (typecheck, lint, unit, integration with a Postgres service, Playwright) | Already available locally; repo is on GitHub. |

Nothing in this plan introduces AI-agent execution, agent actors, or orchestration (see `PRODUCT-RULES.md` §8).

## 3. Module layout

```text
src/
  app/                          # Routes only: thin, no business logic
    (auth)/sign-in/
    (app)/layout.tsx            # Shell: sidebar + topbar
    (app)/dashboard/
    (app)/my-work/
    (app)/projects/
    (app)/projects/[projectKey]/{overview,issues,board,files,team,activity}/
    (app)/issues/[issueKey]/    # Permalink; renders the inspector full-page
    (app)/team/
    (app)/executive/
    (app)/admin/
    api/attachments/            # Upload (multipart) + authorized download
    api/exports/activity/       # Server-side CSV export
  modules/
    identity/                   # Users, sessions, system-role grants
    access/                     # Policies: can(), requireProjectRole(), scoped filters
    projects/                   # Projects, membership, project roles, health label
    issues/                     # Issues, hierarchy rules, keys, user stories, acceptance criteria
    collaboration/              # Notes (+ revisions), comments
    attachments/                # Attachment records, storage/ drivers
    activity/                   # recordActivity(tx, …), queries, renderers
    reporting/                  # My Work, project overview, portfolio, contributions
  components/                   # Feature UI: shell/, hierarchy/, inspector/, board/, activity/, people/
  ui/                           # Design-system primitives on top of Radix
  lib/                          # db client, env, errors, time zone, ids
prisma/
  schema.prisma
  migrations/
  seed.ts                       # Development seed only
tests/
  e2e/                          # Playwright
```

Each module exposes:

- `*.rules.ts` — pure domain functions (no I/O), e.g. `assertValidParent(childType, parent)`. Unit-tested.
- `*.schema.ts` — Zod input schemas.
- `*.service.ts` — the **only** code that writes. Every function takes an `AuthContext`, checks policy, runs one Prisma transaction, and calls `recordActivity(tx, …)`.
- `*.queries.ts` — reads, always filtered through `access` scoping.

Boundary rules (enforced with ESLint import restrictions):

1. `app/` and `components/` may import `modules/*/queries`, `modules/*/service` and `ui/`, never `lib/db` directly.
2. A module may call another module's service or queries, never its tables directly.
3. Only `activity/` writes `ActivityEvent`, and only via `recordActivity` with a transaction handle.

## 4. Data model (target)

Prisma-flavoured sketch; final names settle in Phase 2.

```text
User               id, email (unique), name, jobTitle?, avatarUrl?, isActive, createdAt, updatedAt
SystemRoleGrant    userId, role (ADMIN | EXECUTIVE), grantedById, grantedAt         PK(userId, role)
Session / Account  (owned by the auth library)

Project            id, key (unique, immutable), name, description?, color, status (PLANNING|ACTIVE|ON_HOLD|COMPLETED),
                   leadId, startDate?, targetDate?, nextIssueNumber, healthLabel?, healthNote?,
                   healthSetById?, healthSetAt?, archivedAt?, createdAt, updatedAt
ProjectMember      projectId, userId, role (LEAD | MEMBER | VIEWER), joinedAt          PK(projectId, userId)

Issue              id, projectId, number, type (EPIC|USER_STORY|TASK|SUB_TASK), parentId?,
                   title, description?, status, priority, assigneeId?, reporterId,
                   startDate?, dueDate? (date), rank (sibling/board order), version (optimistic lock),
                   completedAt?, archivedAt?, createdAt, updatedAt
                   UNIQUE(projectId, number)
UserStoryDetails   issueId (PK, FK), asA, iWant, soThat                                  all NOT NULL, non-blank
AcceptanceCriterion id, issueId, position, text, isMet, metById?, metAt?, createdAt, updatedAt, deletedAt?

Note               id, issueId, authorId, category, title, body, createdAt, updatedAt, deletedAt?
NoteRevision       id, noteId, title, body, category, editedById, editedAt
Comment            id, issueId, authorId, body, createdAt, editedAt?, deletedAt?
Attachment         id, issueId, uploadedById, storageKey (unique), originalFilename, mimeType, sizeBytes,
                   sha256, status (PENDING|READY), createdAt, deletedAt?, deletedById?

ActivityEvent      id, occurredAt, actorType (USER|SYSTEM), actorId?, action, entityType, entityId,
                   projectId?, issueId?, changes jsonb ([{field, before, after}]), metadata jsonb?
```

Notes on the model:

- **Issue key is not stored as a separate source of truth.** It is `project.key + '-' + issue.number`; project keys are immutable, so the key is stable. A generated column or view can expose it for search.
- **No `progress` column.** Progress is derived (`PRODUCT-RULES.md` §1.4).
- **Nothing hard-deletes** issues, notes, comments or attachments in normal operation; foreign keys use `RESTRICT`, not `CASCADE`.
- `ActivityEvent.projectId` is nullable so system/admin events (role grants, user deactivation) have a home.
- Job title is a display field; permissions come only from `SystemRoleGrant` and `ProjectMember.role`.

## 5. Invariants and where they are enforced

| Invariant | Domain code | Database |
|---|---|---|
| Legal parent type per issue type | `issues.rules.assertValidParent` | `BEFORE INSERT OR UPDATE` trigger on `issue` checking parent type |
| Epic has no parent; others must have one | rules | `CHECK ((type = 'EPIC') = (parent_id IS NULL))` |
| Parent in same project | rules | same trigger |
| Type change valid for parent and children | rules | trigger checks children on type change |
| Story fields present and non-blank | Zod + service | `CHECK (btrim(as_a) <> '')` etc. |
| Atomic, unique, never-reused issue number | service: `UPDATE project SET next_issue_number = next_issue_number + 1 … RETURNING` in the create transaction | `UNIQUE(project_id, number)` |
| Activity is append-only | only `recordActivity` inserts | trigger raising on `UPDATE`/`DELETE` of `activity_event`; application DB role has no `UPDATE`/`DELETE` privilege on it |
| Lost-update protection | service compares `version` | `UPDATE … WHERE id = $1 AND version = $2` |

Cycles are impossible given strict type levels plus the type-change rule; no recursive cycle check is required.

## 6. Authorization model

```text
AuthContext = { userId, systemRoles: Set<ADMIN|EXECUTIVE>, projectRoles: Map<projectId, LEAD|MEMBER|VIEWER> }
```

Loaded once per request from the session. Policies (initial):

| Capability | Member | Viewer | Project Lead | Executive | Admin |
|---|---|---|---|---|---|
| Read project content | own projects | own projects | own project | **all** | metadata only |
| Create/edit issues, notes, comments, attachments | own projects | — | own project | only where also a member | — |
| Change project members, lead, health label, settings | — | — | own project | — | — |
| Create/archive projects | — | — | — | — | yes |
| Manage users and system roles | — | — | — | — | yes |
| Company-wide activity log, portfolio, contributions | — | — | — | yes | — |
| Export activity/contribution data | — | — | own project | yes (audited) | — |

Rules:

- Reads go through query functions that **apply scope in SQL** (`WHERE project_id IN (…)` or no restriction for Executive), so unauthorized rows are never loaded.
- Mutations call `access.require(ctx, capability, resource)` before opening the transaction.
- Unauthorized access to a specific resource returns **404**, not 403, to avoid leaking existence.
- Server Actions are treated as public HTTP endpoints: they authenticate and authorize every call.

## 7. Activity pipeline

```text
Server Action / Route Handler
  → Zod parse
  → access.require(...)
  → prisma.$transaction(async tx => {
        before = load(tx, id)                      // with version check
        after  = apply change
        diff   = computeChanges(before, after)     // [] → no-op, no event
        recordActivity(tx, { actor, action, entity, projectId, issueId, changes: diff })
        if status moved into DONE  → recordActivity(... 'issue.completed')
        if status moved out of DONE → recordActivity(... 'issue.reopened')
     })
  → revalidate affected views
```

- Action names are a TypeScript union and a database check list, e.g. `issue.created`, `issue.status_changed`, `note.added`, `attachment.removed`, `system_role.granted`.
- Human sentences ("Sarah moved AQUA-42 from To Do to In Progress") are rendered at read time from `changes`, so wording can change without rewriting history.
- Contribution queries read from `ActivityEvent` (e.g. completions by assignee-at-completion recorded in `metadata`), not from current issue state.

## 8. Attachments

```ts
interface ObjectStorage {
  put(key: string, body: ReadableStream, opts: { contentType: string; contentLength: number }): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  getDownloadUrl(key: string, opts: { filename: string; contentType: string; expiresInSeconds: number }): Promise<string>;
  delete(key: string): Promise<void>;
}
```

First production flow (simple and fully authorized):

1. `POST /api/attachments` (multipart) — authenticate, authorize against the issue, enforce size limit while streaming, detect MIME from content, compute SHA-256.
2. Insert `Attachment` as `PENDING` with a random `storageKey` (`attachments/<projectId>/<uuid>`).
3. Stream to storage; on success mark `READY` and record `attachment.added` in one transaction.
4. Download: `GET /api/attachments/:id` authorizes, then redirects to a short-lived signed URL (S3) or streams the file (local driver), always with `Content-Disposition: attachment`.
5. A periodic cleanup removes `PENDING` records older than one hour and their objects.

Direct-to-storage presigned uploads can replace step 1–3 later if file sizes grow; the interface already allows it.

## 9. Frontend architecture

- **URL is the source of navigation state**: `/projects/AQUA/issues?issue=AQUA-42&tab=notes`. Back/forward and links work; the inspector is a deep-linkable panel. `/issues/AQUA-42` is the permalink.
- **Server Components** render authorized data; **client components** for the hierarchy tree (expand/collapse, keyboard navigation), inspector editing, board, and dialogs.
- Mutations use Server Actions with `useOptimistic` for status/assignee changes and board moves, reconciled by revalidation. Errors roll back and show a toast.
- No full-page re-render on change: forms keep drafts; toasts never destroy input.
- **Accessibility**: real `<button>`/`<a>` elements, tree uses the ARIA tree pattern, dialogs trap focus, board supports keyboard moves, minimum body text 13 px.
- **Responsive**: a collapsible sidebar or bottom navigation below 820 px; the inspector becomes a full-screen sheet on small screens.
- **Design tokens** ported from `styles.css:1-33` into CSS variables consumed by Tailwind; type colours (Epic purple, Story teal, Task blue, Sub-task gray) and status colours preserved.
- Controls that are not implemented are not rendered.

## 10. Open decisions (need the product owner)

| Decision | Why it matters | Default if not decided |
|---|---|---|
| Company identity provider (Microsoft Entra ID, Google Workspace, other, or none) | Determines OIDC configuration and whether passwords exist at all | OIDC-ready auth with email + password for local development only |
| Hosting target (company VM/Docker, a PaaS, a cloud provider) | Affects storage driver, database hosting, secrets, backups | Docker image + managed PostgreSQL + S3-compatible bucket |
| Object storage provider | Driver configuration only | S3-compatible; MinIO in Docker for local development |
| Company time zone for "overdue" | Date boundary for due dates | `Indian/Maldives` (UTC+5), configurable |
| Defaults listed in `PRODUCT-RULES.md` §10 | Product behaviour | As written there |

## 11. Explicitly not in the first production release

Timeline/Gantt (until start and due dates are in real use), Inbox/notifications, Reports beyond Executive and project overview, global search/command palette, custom workflows, sprints, story points, email, integrations, and any AI-agent execution.
