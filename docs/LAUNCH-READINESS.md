# Launch readiness

This is an internal company application. It is ready for an internal pilot on one server once the deployment prerequisites below are in place. It is not a customer-facing product, and it is not ready to scale across several application instances without the recommended follow-ups.

## Ready

A team can:

- Manage multiple projects (AquaDesk, SignVeli, AIB Portal, Internal PMS in the development seed).
- Break work into Epics, User Stories, Tasks and Sub-tasks, with the hierarchy enforced in the database.
- See who owns work, set due dates and planned starts, and track overdue work in the company time zone.
- Collaborate with notes, comments and attachments.
- Move executable work on a board, and see planned work on a timeline.
- Use My Work and Inbox for personal attention, and search the workspace they are allowed to see.
- Read project activity and factual contribution history. There is no productivity score.
- Give an Executive a company view, management attention, a master activity log and reports with CSV export.
- Keep Admin separate from project content and from the Executive view.

Authorization, sessions, attachment rules, append-only activity and the security headers from Stage 8 are in place. See [`SECURITY.md`](SECURITY.md).

## Required before internal deployment

These are configuration and operations, not new product features.

- A production PostgreSQL database that is not the local `pms_local_dev` credential, with migrations applied (`pnpm db:deploy`). Do not run the development seed.
- A strong `BETTER_AUTH_SECRET` from `openssl rand -base64 32`. Placeholder and development secrets are refused when the public URL is not localhost.
- `BETTER_AUTH_URL` set to the real `https://` origin so the session cookie is Secure.
- HTTPS in front of the application.
- Object storage: either a durable disk for `STORAGE_DRIVER=local`, or an S3-compatible bucket with the `S3_*` variables. Local disk on a single container is not a backup.
- A backup and restore plan for PostgreSQL and the attachment bucket.
- `COMPANY_TIMEZONE` set to the company’s IANA zone.
- Provisioned user accounts. Sign-up stays disabled. Password login may stay on for the pilot, or OIDC can be configured with all `AUTH_OIDC_*` variables. Do not use `workhub-dev-only-pass`.
- One application instance, or an edge rate limit in front of several. The in-process limiter is not shared across processes.

## Recommended shortly after launch

- Distributed rate limiting if more than one instance serves traffic.
- Malware scanning of uploaded objects in the storage pipeline.
- Error reporting and uptime monitoring.
- Company SSO, if the organisation wants it. The generic OpenID Connect hook already exists.
- A nonce-based Content Security Policy. The current policy allows inline scripts because Next.js emits them.

## Deferred product capabilities

Not required for this internal milestone, and not implemented:

- Sprints, backlog, story points, velocity
- Issue dependencies
- Custom workflows
- GitHub or other source-control integration
- Email or push notifications, and scheduled report delivery
- A full user-administration product (invite, deactivate and grant roles from the screen). The Administration page lists people and can create a project.
- Direct AI-agent execution
- A native mobile app
- Customer-facing SaaS features

## Known technical limits

- Denied project pages can still return HTTP 200 in this Next.js version. The screen and title say the page was not found, and the body does not include the project.
- Rate limits and Better Auth’s sign-in limit live in one Node process.
- Clock times in the interface are displayed in UTC so the server and browser agree. Calendar dates (due, planned start, targets) stay calendar dates and use `COMPANY_TIMEZONE` for “today” and overdue.
- Attachment malware is not scanned.
