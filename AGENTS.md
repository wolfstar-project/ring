# Agent Instructions

The authoritative agent guidance for this repository lives in
[.github/copilot-instructions.md](.github/copilot-instructions.md). All
planners, reviewers, and implementers must read that file first — it documents
the architecture, naming conventions, import aliases, command/API patterns, and
the pre-commit checklist (`pnpm build`, `pnpm lint:fix`, `pnpm prisma:generate`
when the schema changes).

## Quick reference

- Package manager: `pnpm`
- Build: `pnpm build` (tsdown / rolldown)
- Lint + format: `pnpm lint` (oxlint + oxfmt --check); auto-fix with
  `pnpm lint:fix`
- Prisma client output: `src/generated/prisma/` — regenerate with
  `pnpm prisma:generate`
- Guild limit defaults and ranges: `src/lib/common/limits.ts`
  (`LimitDefinitions`)
- Plans produced by **prometheus** are stored under `.atlas/plans/`.
- Conventional Commits are required.

## Cursor Cloud specific instructions

### Node.js

`package.json` requires **Node >= 24**. Activate Node 24 before any `pnpm`
command if the VM default is older.

### Infrastructure (PostgreSQL + Redis)

There is **no `compose.dev.yml`** in this repo and Docker is not installed on
the Cloud VM. PostgreSQL 16 and Redis 7 are installed natively by the update
script's sibling setup and are started manually (systemd is not running):

```bash
sudo pg_ctlcluster 16 main start          # Postgres on :5432
redis-server --port 8287 --requirepass redis --daemonize yes   # Redis on :8287
```

Postgres is seeded with role `postgres`/password `postgres` and database `ring`.
Redis uses port `8287` and password `redis` (see `src/.env`). Redis connection
errors are swallowed at the source, so the app boots even if Redis is down.

Apply migrations after Postgres is healthy (once per DB):

```bash
pnpm prisma:generate
pnpm exec prisma migrate deploy
```

### Environment variables

Local overrides live in `src/.env.local` (gitignored); it is loaded with
priority over `src/.env`. The HTTP framework requires non-empty
`DISCORD_PUBLIC_KEY` and `DISCORD_TOKEN` to boot. `INTERNAL_API_STARYL_TOKEN`
must match Staryl's `INTERNAL_RING_TOKEN`.

**Gotcha — `DATABASE_URL` must be in the process env at launch.**
`src/lib/setup/prisma.ts` builds the Prisma adapter from
`process.env.DATABASE_URL` at module-import time, which runs _before_ the dotenv
loader populates env from `src/.env*`. In production the orchestrator injects
env vars; locally you must export it before starting, otherwise Prisma tries to
connect to host `base`:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ring?schema=public"
```

**Gotcha — placeholder Discord token crashes the process.** On boot
`registerCommands()` pushes slash commands to Discord and throws `401` with
placeholder credentials; the unhandled rejection would tear down the (already
listening) servers. To keep the API/HTTP servers alive for local testing without
real Discord credentials, run with:

```bash
export NODE_OPTIONS="--enable-source-maps --unhandled-rejections=warn"
```

With real `DISCORD_TOKEN`/`DISCORD_CLIENT_ID`/`DISCORD_PUBLIC_KEY` this is
unnecessary.

### Running the app

| Service                   | Port | Purpose                       |
| ------------------------- | ---- | ----------------------------- |
| Discord HTTP interactions | 3000 | Slash commands (`HTTP_PORT`)  |
| Fastify API               | 3001 | Guild config API (`API_PORT`) |

```bash
pnpm dev          # build + start
pnpm lint         # oxlint + oxfmt
pnpm build        # tsdown build (CI also runs prisma:generate first)
```

Quick smoke test once running:

```bash
curl http://localhost:3001/
curl -H "Authorization: $INTERNAL_API_STARYL_TOKEN" http://localhost:3001/guilds/123456789012345678
```

There is **no automated test suite**; CI runs `pnpm lint` and `pnpm build` only.
