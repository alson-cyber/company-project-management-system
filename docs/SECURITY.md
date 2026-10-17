# Security

This document describes the controls that are actually implemented. It is not a certification, a penetration-test report, or a promise about a future production deployment.

## Authentication

Sign-in uses [Better Auth](https://www.better-auth.com/) with a Prisma adapter.

- Self-service sign-up is disabled. Accounts are provisioned by an administrator or, in development only, by the seed.
- Email and password sign-in is on only when `AUTH_PASSWORD_LOGIN_ENABLED` is true. The development seed password is `workhub-dev-only-pass` and must never be used outside local development.
- Optional company SSO is generic OpenID Connect: PKCE, ID-token verification, and no implicit sign-up. A person who is not already a workspace member cannot arrive through SSO.
- Sessions last 7 days and refresh daily. The session cookie cache is off, so each request loads the session row.
- The session cookie is marked Secure when `BETTER_AUTH_URL` is `https://`. Local HTTP development leaves it unset so localhost works.
- Creating a session is refused unless `users.status` is `ACTIVE`. After that, `loadAuthContext` also requires an active workspace member, so a deactivated user with an old cookie gets no application access.
- The signed-in user id comes from the session. Mutations do not accept a user id from the client as the actor.
- Better Auth's own rate limit for sign-in is enabled when `NODE_ENV` is `production`. It is in-process, same as the application limiter below.
- `prisma/seed.ts` refuses to run when `NODE_ENV` is `production`.

Production startup refuses `BETTER_AUTH_SECRET` values that contain `replace-with`, `dev-only`, or `changeme`, and refuses a `DATABASE_URL` that still contains the local credential `pms_local_dev`, when `BETTER_AUTH_URL` is not localhost. A local `next build` or `next start` on `http://localhost` can still use the development database.

CSRF for Better Auth cookie flows is handled by that library (origin checks on its auth endpoints). Application mutations are Next.js Server Actions or same-origin `fetch` calls that require the session cookie. There is no separate custom CSRF token.

## Authorization

Permissions are decided in `src/server/access/policy.ts` and enforced in services. Hiding a link is not authorization.

| Capability | Member | Project Lead | Admin | Executive |
| --- | --- | --- | --- | --- |
| View a project's issues, files, board, timeline, activity | Only projects they belong to | Their projects | No | Every non-archived project |
| Create and edit issues, notes, comments, attachments | Only projects they belong to | Their projects | No | Only projects they also belong to |
| Edit another person's note or comment | No | Yes, on their project | No | Only if they are also that project's lead |
| Project settings, membership, health | No | Their projects | No | No |
| Executive portfolio, company activity, executive reports | No | No | No | Yes |
| Administration | No | No | Yes | No |
| Create a project | No | No | Yes | No |
| See email addresses in search | No | No | Yes | No |

A person can hold more than one grant. An Executive who is also a member of a project may collaborate there. The Executive grant alone does not. Admin does not grant project visibility.

Missing project visibility is a not-found error, including for direct issue, attachment, note, and comment ids. A viewer who can see the project but lacks the capability gets forbidden. Executive and Administration pages call `requireWorkspacePermission`, which uses Next.js `notFound()` (HTTP 404).

## Project isolation

Issue, search, report, export, file, and activity queries start from the projects the caller may see:

- Executive: all non-archived projects.
- Everyone else, including Admin: memberships only.

A requested project key, assignee id, actor id, or issue key is a filter inside that set. It is never the authorization decision. Invalid project keys, user ids, statuses, and calendar dates are dropped. A custom report window is clamped to 366 days.

Search queries are truncated to 80 characters. Result lists are fixed small pages. Activity cursors must be a timestamp plus a UUID; anything else is ignored.

## Attachments

- The application limit is `ATTACHMENT_MAX_BYTES` (default 25 MB). The upload route rejects a declared body larger than that, and the service rejects the bytes after they are read.
- The Next.js proxy body cap is 30 MB so a legal 25 MB upload is not refused before the policy runs. Server Actions stay at 2 MB; uploads go through the attachment route, not a Server Action.
- The stored object key is `attachments/{issueId}/{random uuid}`. The client never supplies a path or key.
- Filenames are reduced to a basename, control characters are removed, and the result is capped at 180 characters.
- `text/html`, SVG, and JavaScript types are stored as `application/octet-stream`.
- Download responses send `X-Content-Type-Options: nosniff`. `Content-Disposition: inline` is used only for JPEG, PNG, GIF, and WebP. Everything else is an attachment download.
- Opening or deleting an attachment checks project permission. A soft-deleted row is not returned.
- Object bytes are removed before the metadata is soft-deleted. If object deletion fails, the row stays so the same request can be retried. Users cannot choose the storage key.
- Local storage resolves keys under the storage root and rejects `..`.
- There is no antivirus scan. A production deployment should scan objects in the storage pipeline before they are served.

## Audit and contribution

`activity_events` has a trigger that rejects `UPDATE` and `DELETE`. Application code only inserts. Significant issue, collaboration, and project changes write that row in the same transaction as the change.

Completion reports credit the actor on `issue.completed`. Reassigning the issue afterwards does not move that credit. This is not a productivity score.

## Notifications

A notification can be listed or marked read only by its recipient, and only while they can still view the project. Mark-all updates that same set. If someone loses project access, the notice disappears from the inbox and cannot be marked read. The row remains, but its issue title is not returned. That avoids leaking project content after access is removed. Duplicate attention uses a unique `(recipient, dedupe key)`.

## Abuse limits

`src/server/security/rate-limit.ts` is a fixed window in this Node process:

- Search: 60 requests per minute per user.
- CSV export: 20 per minute per user.
- Upload: 30 per minute per user.

It does not coordinate across multiple servers. When the deployment has more than one instance, apply the same limits at the edge or load balancer. Redis was not added for this.

## Headers

Every response from `next.config.ts` sets:

- `Content-Security-Policy` with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'`
- `script-src 'self' 'unsafe-inline'`, plus `'unsafe-eval'` in development only (Next.js needs this today; a nonce policy is a later tightening)
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob:`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

`X-Powered-By` is disabled. Production error responses from the search, export, and attachment routes are generic. Unexpected errors are logged on the server.

## Secrets

`.env` is local. `.env.example` contains placeholders and the development-only seed password. Do not commit real secrets, production database URLs, or OIDC client secrets. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`.

## Known limitations

- Inaccessible project pages render the not-found screen and a "Not found" title. In this Next.js version the HTTP status for those project routes can still be 200. Executive, Administration, issue, and attachment denials return 404. The body does not include the hidden project.
- The content security policy still allows inline scripts, which Next.js emits without a nonce.
- Rate limits and Better Auth's sign-in limit are per process.
- Attachment malware is not scanned.
- There is no SSO vendor rollout, email delivery, WAF, SIEM, or DLP product in this application.
- Administration does not yet include a full user-management product. The Administration page is still authorized server-side.
- A notification left behind after access is removed is hidden rather than rewritten. It is not deleted.

## Development data

Playwright and integration tests use `pms_test`, which must be a different database from `pms_dev`. `scripts/remove-stray-example-project.ts` deletes only a project whose key is `EXAMPLE` and whose name is `Aquadesk`, and only from `pms_dev`.
