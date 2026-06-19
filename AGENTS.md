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

### Infrastructure (PostgreSQL)

Start the database (once per VM session):

```bash
docker compose -f compose.dev.yml up postgres -d
```

Override in `src/.env.local` (gitignored):

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ring?schema=public"
```

Apply migrations after Postgres is healthy:

```bash
pnpm prisma:generate
pnpm exec prisma migrate deploy
```

### Environment variables

Copy `src/.env` values into `src/.env.local` for local overrides. The HTTP
framework requires non-empty `DISCORD_PUBLIC_KEY` and `DISCORD_TOKEN` to boot.
`INTERNAL_API_STARYL_TOKEN` must match Staryl's `INTERNAL_RING_TOKEN`.

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
