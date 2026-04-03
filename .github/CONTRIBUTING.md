# Contributing to Ring

Thank you for your interest in contributing! This document provides guidelines
and instructions for contributing.

> **Important** Please be respectful and constructive in all interactions. We
> aim to maintain a welcoming environment for all contributors.

## Goals

The goal of Ring is to build a fast, reliable private centralized management
android for the WolfStar Network, prioritizing stability, speed, and a clean
developer experience.

### Core values

- Stability and reliability
- Type safety and code quality
- Speed and performance

### Target audience

Ring is built for the WolfStar Network maintainers who need centralized guild
configuration management across multiple bots (Staryl, WolfStar).

## Table of Contents

- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Development workflow](#development-workflow)
  - [Available commands](#available-commands)
  - [Project structure](#project-structure)
- [Code style](#code-style)
  - [TypeScript](#typescript)
  - [API route patterns](#api-route-patterns)
  - [Naming conventions](#naming-conventions)
  - [Database changes](#database-changes)
- [Submitting changes](#submitting-changes)
  - [Before submitting](#before-submitting)
  - [Pull request process](#pull-request-process)
  - [Commit messages and PR titles](#commit-messages-and-pr-titles)
  - [PR descriptions](#pr-descriptions)
- [Pre-commit hooks](#pre-commit-hooks)
- [Using AI](#using-ai)
- [Questions?](#questions)
- [License](#license)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+ (LTS)
- [pnpm](https://pnpm.io/) 10+ (required -- not npm or yarn)
- [PostgreSQL](https://www.postgresql.org/) 14+
- [Discord Application](https://discord.com/developers/applications/) (for bot
  token)

### Setup

1. Fork and clone the repository

   ```bash
   git clone https://github.com/wolfstar-project/ring.git
   cd ring
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables

   Create `src/.env` and configure:

   Required variables:
   - `DATABASE_URL` -- PostgreSQL connection string
   - `DISCORD_CLIENT_ID` -- Discord application client ID
   - `DISCORD_TOKEN` -- Bot token
   - `DISCORD_PUBLIC_KEY` -- Discord application public key
   - `HTTP_ADDRESS` -- Server bind address (default: `0.0.0.0`)
   - `HTTP_PORT` -- Server port (default: `3000`)
   - `API_ADDRESS` -- Internal API bind address
   - `API_PORT` -- Internal API port
   - `CLIENT_OWNERS` -- Comma-separated list of owner user IDs
   - `REGISTRY_GUILD_ID` -- Registry guild ID
   - `INTERNAL_API_STARYL_TOKEN` -- Bearer token for Staryl API access
   - `INTERNAL_API_WOLFSTAR_TOKEN` -- Bearer token for WolfStar API access

4. Set up the database:

   ```bash
   pnpm prisma:generate    # Generate Prisma client
   ```

5. Build and start:

   ```bash
   pnpm dev                # Build + start
   ```

## Development workflow

### Available commands

```bash
# Development
pnpm build                # Build TypeScript via tsdown
pnpm start                # Start the application
pnpm dev                  # Build + start
pnpm watch                # Watch mode for development

# Code Quality
pnpm lint                 # Auto-fix lint issues (ESLint)
pnpm format               # Format code with Prettier

# Database
pnpm prisma:generate      # Regenerate Prisma client after schema changes

# Maintenance
pnpm clean                # Remove build artifacts
```

### Project structure

```text
src/
├── main.ts                     # Application entry point
├── api/
│   └── routes/                 # Internal REST API endpoints
│       ├── _load.ts            # Route loader
│       ├── index.ts            # Root route
│       └── guilds/             # Guild configuration endpoints
│           └── [...id].ts      # Guild lookup by ID
├── commands/                   # Discord slash commands (decorator pattern)
├── lib/
│   ├── augments.d.ts           # Environment variable type augmentations
│   └── setup/                  # Application initialization (env, Fastify, Prisma, logger)
│       ├── all.ts              # Setup orchestrator
│       ├── fastify.ts          # Fastify server setup
│       ├── logger.ts           # Logger setup
│       └── prisma.ts           # Prisma client setup
└── locales/                    # Translation JSON files organized by locale

prisma/
└── schema.prisma               # Database schema
```

## Code style

When committing changes, try to keep an eye out for unintended formatting
updates. These can make a pull request look noisier than it really is and slow
down the review process.

The project uses Prettier to handle formatting. If you want to get ahead of any
formatting issues, run `pnpm format` before committing.

### TypeScript

- We care about good types -- never cast things to `any`; use `cast<T>()` from
  `@sapphire/utilities` when narrowing is needed
- Use strict mode and validate rather than just assert
- Use `@sapphire/result` for fallible operations instead of raw try/catch
- Use `const enum` for internal-only enumerations (prefixed with
  `oxlint-disable-next-line no-restricted-syntax`)
- Use standard `enum` for values that cross module boundaries or are used in
  Prisma
- Use `type` imports for type-only values: `import type { ... } from "..."`
- Use path mapping aliases for internal imports: `#lib/*`, `#api/*`
- Group imports: type imports first, then internal aliases, then external
  packages

### API route patterns

Routes are registered directly on `container.server` (Fastify). Always verify
authorization headers and validate request parameters:

```typescript
container.server.route({
	url: "/guilds/:id",
	method: "GET",
	handler: async (request, reply) => {
		// Verify authorization, validate params, handle request
	},
});
```

### Naming conventions

| Type             | Convention      | Example                             |
| ---------------- | --------------- | ----------------------------------- |
| Directories      | kebab-case      | `api/routes/`                       |
| TypeScript files | camelCase       | `config.ts`                         |
| Variables        | camelCase       | `guildId`, `mappings`               |
| Constants        | PascalCase enum | `Mappings.staryl`                   |
| Path constants   | PascalCase      | `PathRoot`, `PathSrc`               |
| Types/Interfaces | PascalCase      | `Guild`, `SetOptions`               |
| Classes          | PascalCase      | `UserCommand`                       |
| Enum members     | PascalCase      | `PermissionFlagsBits.Administrator` |
| Private methods  | `#`-prefixed    | `this.#validate()`                  |

### Database changes

After modifying `prisma/schema.prisma`, always regenerate the Prisma client:

```bash
pnpm prisma:generate
```

Models use `@@map()` for snake_case table names and `@map()` for snake_case
column names. Always commit schema changes alongside the regenerated client.

## Submitting changes

### Before submitting

1. Ensure your code follows the style guidelines
2. Run linting: `pnpm lint`
3. Validate the build: `pnpm build`
4. Regenerate Prisma client if schema changed: `pnpm prisma:generate`

### Pull request process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Push your branch and open a pull request
4. Ensure CI checks pass (lint, build)
5. Request review from maintainers

### Commit messages and PR titles

Write clear, concise PR titles that explain the "why" behind changes.

We use [Conventional Commits](https://www.conventionalcommits.org/). Since we
squash on merge, the PR title becomes the commit message in `main`, so it is
important to get it right.

Format: `type(scope): description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`, `types`

Scopes (optional): `commands`, `api`, `db`, `i18n`, `deps`

Examples:

- `feat(api): add endpoint for filtered words configuration`
- `fix(commands): resolve config set upsert handling`
- `docs: update installation instructions`
- `chore(deps): update @skyra/http-framework`

> **Note** Use lowercase letters in your pull request title. Individual commit
> messages within your PR don't need to follow this format since they'll be
> squashed.

### PR descriptions

If your pull request directly addresses an open issue, use the following inside
your PR description:

```text
Fixes #123
```

or

```text
Closes https://github.com/wolfstar-project/ring/issues/123
```

This links the pull request to the issue and automatically closes it when the PR
is merged.

## Pre-commit hooks

Git hooks are managed via Husky. Commit messages are validated against the
Conventional Commits format by `commitlint`.

## Using AI

You're welcome to use AI tools to help you contribute. But there are two
important ground rules:

### 1. Never let an LLM speak for you

When you write a comment, issue, or PR description, use your own words. Grammar
and spelling don't matter -- real connection does. AI-generated summaries tend
to be long-winded, dense, and often inaccurate. The goal is not to sound
impressive, but to communicate clearly.

### 2. Never let an LLM think for you

Feel free to use AI to write code, tests, or point you in the right direction.
But always understand what it has written before contributing it. Take personal
responsibility for your contributions. Don't say "ChatGPT says..." -- tell us
what you think.

For more context, see
[Using AI in open source](https://roe.dev/blog/using-ai-in-open-source).

## Questions?

If you have questions or need help, feel free to
[open an issue](https://github.com/wolfstar-project/ring/issues) for discussion.

## License

By contributing to Ring, you agree that your contributions will be licensed
under the [Apache License 2.0](../LICENSE).
