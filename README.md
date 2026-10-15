# Workhub — Project Management System, Checkpoint 0.5

A modern, dependency-free starter for the internal company project-management system.

This checkpoint is intentionally designed to be **immediately runnable and reviewable** before Cursor takes over the production implementation. It is more than a static mockup: hierarchy creation, issue selection, notes, attachment metadata, comments, board status movement, activity logging, My Work, team contributions, and the Executive/Master view all have working browser interactions.

## Run locally

From this folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

The login is a visual prototype. Any valid-looking email/password will enter the product. Using an email containing `executive` selects the Executive demo role.

## Core product hierarchy

```text
Company
└── Project
    └── Epic
        └── User Story
            └── Task
                └── Sub-task
```

The browser prototype enforces these parent/child rules when creating children from the hierarchy.

## Functional in this checkpoint

- Modern login experience
- Responsive application shell
- Dashboard
- Project portfolio
- Project workspace and tabs
- Expandable issue hierarchy
- Project → Epic → User Story → Task → Sub-task structure
- User Story `As a / I want / So that` representation
- Issue detail panel
- Notes attached to work items
- Attachment UI and browser-side metadata capture
- Comments
- Issue and project activity history
- Kanban board with drag/drop status changes
- My Work
- Team contribution view
- Executive / Master dashboard
- Company-wide activity log
- Master activity CSV export
- Browser persistence via `localStorage`
- Realistic seeded data for product evaluation

## Important limitation

Checkpoint 0.5 uses a browser-side persistence layer on purpose. It is a product/interaction foundation, **not the production backend**. Cursor should preserve the interaction model and visual language while migrating persistence, authentication, authorization, attachments, and audit guarantees to the production stack.

Read:

- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/CURSOR-HANDOFF.md`
- `data/schema.sql`

## Reset demo data

Open browser devtools and run:

```js
localStorage.removeItem('workhub-checkpoint-05')
location.reload()
```

## Visual direction

The UI aims for a modern business-tool feel: dense enough for serious work, clean enough for non-Jira users, with influence from Notion/Linear-style information hierarchy rather than a card-heavy admin template.

`Workhub` is a placeholder product name and can be replaced without affecting the architecture.
