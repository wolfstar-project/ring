# AGENTS.md - Ring

## Project Overview

Private centralized management android for the WolfStar Network. Discord
HTTP-interactions bot built on `@skyra/http-framework` (Fastify), with an
internal REST API for sibling bots (Staryl, WolfStar). PostgreSQL via Prisma
v7 + `@prisma/adapter-pg`.

## Conventions

- Language: TypeScript strict (`@sapphire/ts-config` + extra-strict +
  decorators + verbatim).
- Module system: ESM (`"type": "module"`).
- Path aliases: `#lib/*`, `#api/*`, `#generated/prisma` (resolved at runtime via
  `package.json#imports`, at build via `tsdown` aliases).
- Naming: kebab-case dirs, camelCase files/vars, PascalCase classes/types/enums.
- Build tool: `tsdown` (rolldown), `unbundle: true`, output `dist/` (`.mjs`).
- Formatter/Linter: `oxlint` + `oxfmt` (`pnpm lint`, `pnpm lint:fix`).
- Package manager: `pnpm@10` (workspace).
- Node: `>=24`.

## Database

- ORM: Prisma Client v7+ (`prisma-client` generator) with `@prisma/adapter-pg`.
- Schema: `prisma/schema.prisma`.
- Generated client: `src/generated/prisma/` (kept inside `src/` so `tsdown` and
  `tsconfig` include it).
- Prisma config: `prisma.config.ts` (loads `src/.env.local`, `src/.env`).
- Migrations: `prisma/migrations/` (PostgreSQL).
- Access: `container.prisma` (Sapphire container, augmented in
  `src/lib/setup/prisma.ts`).

## HTTP / API

- Discord interactions: HTTP via `@skyra/http-framework` `Client` listening on
  `HTTP_ADDRESS:HTTP_PORT`.
- Internal REST API: Fastify on `API_ADDRESS:API_PORT`, registered as
  `container.server` in `src/lib/setup/fastify.ts`. Routes loaded from
  `src/api/routes/_load.ts`.
- Auth for internal API: bearer tokens (`INTERNAL_API_STARYL_TOKEN`,
  `INTERNAL_API_WOLFSTAR_TOKEN`).

## Runtime Layout

- Entry: `dist/main.mjs` (compiled from `src/main.ts`).
- Locales: copied to `dist/locales/` by `tsdown` `copyPlugin`. Loaded at runtime
  relative to `import.meta.url` (i.e. `./locales`).
- `.env`: loaded via `@skyra/env-utilities` `setup()` from `src/.env`.

## Commands

- `pnpm install`
- `pnpm prisma:generate`
- `pnpm build` (tsdown)
- `pnpm start` (`node --enable-source-maps dist/main.mjs`)
- `pnpm dev` (build + start)
- `pnpm lint`, `pnpm lint:fix`
- `pnpm clean`

## Plans Directory

`.atlas/plans/`
