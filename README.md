# Workhub — Internal Project Management System

Company project management with Jira-level structure and a calmer Linear/Notion-like workspace.

The mandatory hierarchy is **Project → Epic → User Story → Task → Sub-task**. Direct AI-agent execution is out of current scope. Product rules live in [`docs/PRODUCT-RULES.md`](docs/PRODUCT-RULES.md).

## Current stage

**Core PMS domain.** The app is a real Next.js application with PostgreSQL, Prisma migrations, database-backed sessions, roles, project membership, and the Issue hierarchy (Epic → User Story → Task → Sub-task). Board, timeline, attachments, inbox and reports are not built yet.

Authoritative documents:

- [`docs/PRODUCT-RULES.md`](docs/PRODUCT-RULES.md) — binding product rules
- [`docs/ARCHITECTURE-PLAN.md`](docs/ARCHITECTURE-PLAN.md) — production architecture
- [`docs/MIGRATION-PLAN.md`](docs/MIGRATION-PLAN.md) — staged migration
- [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md) — audit of the original prototype
- [`docs/ISSUE-DOMAIN.md`](docs/ISSUE-DOMAIN.md) — issue keys, progress, archive, activity

The Checkpoint 0.5 clickable prototype is preserved in [`prototype/`](prototype/) for visual comparison. It is not the running product.

## Architecture

Modular monolith:

- Next.js App Router (Node runtime) and TypeScript strict
- PostgreSQL 17 via Docker Compose
- Prisma ORM and SQL migrations
- Zod at every server boundary
- Better Auth with database sessions (email/password in development; generic OIDC when configured)
- Server-side authorization in `src/server/access`
- Local filesystem or S3-compatible object storage behind one interface (attachments come later)
- Append-only `activity_events` (application only inserts; a database trigger rejects updates and deletes)

## Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL)

## Setup

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET to the output of: openssl rand -base64 32
pnpm install
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Every variable is documented in `.env.example` and validated by `src/server/env.ts`. Do not commit `.env`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (matches Docker Compose) |
| `TEST_DATABASE_URL` | Separate database for integration tests |
| `BETTER_AUTH_SECRET` | Session signing secret (≥ 32 characters) |
| `BETTER_AUTH_URL` | Public origin, e.g. `http://localhost:3000` |
| `SEED_DEV_PASSWORD` | Shared password for seeded development users |
| `ATTACHMENT_MAX_BYTES` | Attachment size limit (default 26214400 = 25 MB) |
| `COMPANY_TIMEZONE` | IANA zone used for “today” when deciding overdue (default `UTC`) |
| `STORAGE_DRIVER` | `local` or `s3` |
| `AUTH_OIDC_*` | Optional company SSO. Leave blank until the identity provider is chosen. |

Docker Compose publishes Postgres on `127.0.0.1:55432` so it does not collide with a local Postgres on 5432. Override with `PMS_POSTGRES_PORT`.

## Development sign-in

Sign-up is disabled. Use a seeded account and `SEED_DEV_PASSWORD` from `.env` (default in `.env.example`: `workhub-dev-only-pass`). These are local development credentials, not company accounts.

| Email | Access |
|---|---|
| `alson.chen@workhub.test` | Executive (also lead of PMS) |
| `sarah.kim@workhub.test` | Project lead of AquaDesk |
| `alex.noor@workhub.test` | Member (engineer) |
| `mika.ross@workhub.test` | Member (designer) |
| `emma.davis@workhub.test` | Member (QA) |
| `omar.haleem@workhub.test` | Admin, not a project member |
| `lina.farah@workhub.test` | Deactivated — cannot sign in |

The login screen lists these accounts in development only.

Future company SSO is plugged in by setting all `AUTH_OIDC_*` variables (any OpenID Connect provider). The login screen then shows a single real “Continue with …” button. Do not add vendor-specific buttons until that provider is configured.

## Tests

```bash
pnpm test:unit
pnpm test:integration   # requires `pnpm db:up`
pnpm test:e2e           # requires a seeded database and the app
pnpm lint
pnpm typecheck
pnpm build
```

## Prototype (visual reference)

```bash
pnpm prototype
```

Then open [http://localhost:4173](http://localhost:4173). See [`prototype/README.md`](prototype/README.md).

## Scripts

| Command | What it does |
|---|---|
| `pnpm db:up` | Start PostgreSQL (health-checked) |
| `pnpm db:down` | Stop PostgreSQL (volume is kept) |
| `pnpm db:deploy` | Apply migrations |
| `pnpm db:seed` | Seed development users, projects and issues |
| `pnpm db:reset` | Drop, migrate, seed (destroys local data) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm prototype` | Serve the preserved Checkpoint 0.5 UI |
