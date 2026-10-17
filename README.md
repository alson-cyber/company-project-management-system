# Workhub — Internal Project Management System

Internal company software for managing delivery. A project breaks down as **Project → Epic → User Story → Task → Sub-task**. People collaborate with notes, comments and files, follow work on a board and a timeline, and management reads the same facts in the Executive Command Centre and reports.

Direct AI-agent execution is **future / optional** and is not part of this system. Binding rules are in [`docs/PRODUCT-RULES.md`](docs/PRODUCT-RULES.md). Security controls are in [`docs/SECURITY.md`](docs/SECURITY.md). What must be true before a real deployment is in [`docs/LAUNCH-READINESS.md`](docs/LAUNCH-READINESS.md).

## Architecture

One Next.js application and one PostgreSQL database.

- Next.js App Router, React, TypeScript
- PostgreSQL via Prisma and SQL migrations
- Better Auth sessions (email and password for provisioned users; optional OpenID Connect)
- Server-side roles: Member, Project Lead, Admin, Executive
- Zod validation on server inputs
- Object storage for attachments (`local` in development, S3-compatible when configured)
- Append-only `activity_events`

The Checkpoint 0.5 prototype in [`prototype/`](prototype/) is a visual reference only. It is not the running product.

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer (the repo pins pnpm 12)
- Docker, for PostgreSQL

## Local setup

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET to the output of: openssl rand -base64 32
pnpm install
pnpm db:up
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Use one development server. Playwright uses port 3100 and must not run at the same time as `pnpm dev` in this directory.

### Database

`pnpm db:up` starts PostgreSQL from Docker Compose and publishes it on `127.0.0.1:55432` (override with `PMS_POSTGRES_PORT`).

| Database | Used by |
| --- | --- |
| `pms_dev` | `pnpm dev`, seed, local use |
| `pms_test` | `pnpm test:integration` and `pnpm test:e2e` |

Integration and Playwright reset and seed `pms_test` only. They refuse to run if the test database is the same as the development database. Do not point `TEST_DATABASE_URL` at `pms_dev`.

### Environment

Every variable is documented in `.env.example` and checked by `src/server/env.ts`. Do not commit `.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Development PostgreSQL connection |
| `TEST_DATABASE_URL` | Isolated database for tests |
| `BETTER_AUTH_SECRET` | Session signing secret, at least 32 characters |
| `BETTER_AUTH_URL` | Public origin, `http://localhost:3000` locally |
| `AUTH_PASSWORD_LOGIN_ENABLED` | Email and password for provisioned users |
| `SEED_DEV_PASSWORD` | Shared password for seeded development users |
| `COMPANY_TIMEZONE` | IANA zone used to decide “today” and overdue |
| `STORAGE_DRIVER` | `local` or `s3` |
| `STORAGE_LOCAL_DIR` | Local attachment directory when the driver is `local` |
| `ATTACHMENT_MAX_BYTES` | Upload limit, default 25 MB |
| `AUTH_OIDC_*` | Optional company SSO. Leave blank until a provider is chosen. |

A non-localhost production origin refuses the local database credential and placeholder auth secrets. See [`docs/SECURITY.md`](docs/SECURITY.md).

### Object storage

Development stores attachment bytes under `STORAGE_LOCAL_DIR` (default `.data/storage`). The database stores metadata and a generated object key, never the user’s path. Set `STORAGE_DRIVER=s3` and the `S3_*` variables for an S3-compatible bucket.

## Development accounts

Sign-up is disabled. Seeded accounts exist only for local development. The password is `SEED_DEV_PASSWORD` in `.env` (the example value is `workhub-dev-only-pass`). The login screen does not list these accounts.

| Email | Access |
| --- | --- |
| `alson.chen@workhub.test` | Executive, and Project Lead of Internal PMS |
| `sarah.kim@workhub.test` | Project Lead of AquaDesk, member of SignVeli |
| `alex.noor@workhub.test` | Member of AquaDesk and Internal PMS; Project Lead of SignVeli and AIB Portal |
| `mika.ross@workhub.test` | Member of AquaDesk and SignVeli |
| `emma.davis@workhub.test` | Member of AquaDesk, AIB Portal and Internal PMS |
| `omar.haleem@workhub.test` | Admin, not a member of any project |
| `lina.farah@workhub.test` | Deactivated. Cannot sign in. |

## Roles

- **Member** — project content only where they belong.
- **Project Lead** — manage their project, including health and membership.
- **Admin** — administration and creating projects. No automatic project content.
- **Executive** — company-wide read of delivery, activity and reports. No automatic write access and no administration.

An Executive who is also a member of a project may collaborate there.

## Tests and build

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

`pnpm test:integration` and `pnpm test:e2e` need `pnpm db:up`. End-to-end tests start their own app on port 3100 against `pms_test`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server on port 3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm db:up` / `pnpm db:down` | Start or stop PostgreSQL. The volume is kept. |
| `pnpm db:deploy` | Apply migrations |
| `pnpm db:seed` | Seed development users, projects and issues. Refuses `NODE_ENV=production`. |
| `pnpm db:reset` | Drop, migrate and seed. Destroys local data. |
| `pnpm db:studio` | Prisma Studio |
| `pnpm prototype` | Serve the old prototype on port 4173 |

`scripts/remove-stray-example-project.ts` deletes only a project named Aquadesk with key EXAMPLE from `pms_dev`. It refuses every other database.
