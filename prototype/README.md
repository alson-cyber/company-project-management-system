# Checkpoint 0.5 prototype

This folder is the original dependency-free starter, kept as a **visual and interaction reference**. It is not the production application.

The production app lives at the repository root and uses Next.js, PostgreSQL and real authentication.

## Run

From the repository root:

```bash
pnpm prototype
```

Or from this folder:

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

Login is visual only (any email/password). Data is stored in `localStorage` under `workhub-checkpoint-05`. Reset with:

```js
localStorage.removeItem("workhub-checkpoint-05");
location.reload();
```

## Do not

- Treat this as a source of production data
- Copy `localStorage` into PostgreSQL
- Use the prototype login behaviour in the production app
