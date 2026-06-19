# Core Requirements

- The end goal is stability, speed, and reliability.
- Ring is a private centralized management android for the WolfStar Network,
  built with TypeScript. It uses HTTP interactions via Discord's HTTP-based bot
  architecture (`@wolfstar/http-framework`) rather than a persistent WebSocket
  connection. It exposes internal REST API endpoints via Fastify for other bots
  in the network to query guild configuration.
- Always reference these instructions first and fall back to search or
  documentation queries only when you encounter unexpected information.

## Code Quality Requirements

- Follow standard TypeScript conventions and best practices with strict mode
- Use the `@wolfstar/http-framework` decorator pattern (`@RegisterCommand`,
  `@RegisterSubcommand`) for Discord slash commands
- Use clear, descriptive variable and function names
- Add comments only to explain complex logic or non-obvious implementations
- Keep functions focused and manageable (generally under 50 lines)
- Use error handling patterns consistently, preferring `@sapphire/result` for
  fallible operations
- Ensure strictly type-safe code, for example by always checking when accessing
  an array value by index
- Never cast things to `any`; use `@sapphire/utilities` helpers like `cast<T>()`
  when narrowing is needed
- Use `const enum` for internal-only enumerations (prefixed with
  `oxlint-disable-next-line no-restricted-syntax`)
- Use standard `enum` for values that cross module boundaries or are used in
  Prisma

## Naming Conventions

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

## Import Conventions

- Use TypeScript path mapping aliases for internal imports: `#lib/*`, `#api/*`,
  `#common/*`, `#types`
- Use `type` imports for type-only values: `import type { ... } from "..."`
- Group imports: type imports first, then internal aliases, then external
  packages
- Prefer importing from barrel files over deep paths

## Project Architecture

### Key Patterns

- **HTTP Framework**: Built on `@wolfstar/http-framework` (Fastify-based),
  handling Discord interactions via HTTP endpoints instead of WebSocket gateway
- **Internal API**: Fastify REST endpoints (`src/api/routes/`) that serve guild
  configuration data to other bots in the WolfStar Network (Staryl, WolfStar),
  authenticated via bearer tokens
- **Guild limits**: Canonical defaults, ranges, and bot mappings live in
  `src/lib/common/limits.ts` (`LimitDefinitions`, `Mappings`, `getMappings`)
- **Database**: PostgreSQL with Prisma ORM. Models use `@@map()` for snake_case
  table names, `@map()` for snake_case column names. Prisma `@default()` values
  must stay in sync with `LimitDefinitions`
- **i18n**: Multi-language support via `@wolfstar/http-framework-i18n` with
  locale JSON files in `src/locales/`
- **Container Pattern**: Services (Prisma, Fastify, Logger) are attached to
  `container` from `@sapphire/pieces` with corresponding type augmentations

### Directory Structure

- `src/main.ts` - Application entry point
- `src/api/routes/` - Internal REST API endpoints (guild config queries)
- `src/api/routes/_load.ts` - Route loader (imports all route files)
- `src/commands/` - Discord slash commands using decorator pattern
- `src/lib/setup/` - Application initialization (env, Fastify, Prisma, logger)
- `src/lib/common/` - Shared constants and guild limit definitions
- `src/lib/types/` - TypeScript type definitions and env augmentations
- `src/locales/` - Translation JSON files organized by locale
- `prisma/schema.prisma` - Database schema

### Command Structure

Commands use the decorator pattern from `@wolfstar/http-framework`:

```typescript
@RegisterCommand((builder) =>
	builder
		.setName("command-name")
		.setDescription("Description")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
)
export class UserCommand extends Command {
	@RegisterSubcommand((builder) => builder.setName("sub").setDescription("..."))
	public async sub(
		interaction: Command.ChatInputInteraction,
		options: Options,
	) {
		// ...
	}
}
```

### API Route Structure

Routes are registered directly on `container.server` (Fastify):

```typescript
container.server.route({
	url: "/path",
	method: "GET",
	handler: async (request, reply) => {
		// Handle request
	},
});
```

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm build                # Build TypeScript via tsdown
pnpm start                # Start the application
pnpm dev                  # Build + start
pnpm watch                # Watch mode for development
pnpm lint                 # Check lint and formatting (oxlint + oxfmt)
pnpm lint:fix             # Auto-fix lint and formatting issues
pnpm prisma:generate      # Regenerate Prisma client after schema changes
pnpm clean                # Remove build artifacts
```

## Pre-commit Checklist

Before committing changes, always run:

1. `pnpm build` - Must build successfully
2. `pnpm lint:fix` - Fix any errors, warnings are acceptable
3. `pnpm prisma:generate` - Must be run if the schema changed

Commit messages must follow Conventional Commits: `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`,
`ci`, `build`

## Key Dependencies

- `@wolfstar/http-framework` - Discord HTTP interaction framework
  (Fastify-based)
- `@wolfstar/http-framework-i18n` - Internationalization for the HTTP framework
- `@wolfstar/shared-http-pieces` - Shared command registration and Sentry
  integration
- `@sapphire/result` - Rust-like Result type for error handling
- `@sapphire/utilities` - General utilities (`cast`, `isNullish`,
  `isNullishOrEmpty`)
- `@discordjs/builders` - Discord slash command option builders
- `@prisma/client` - Database ORM
- `fastify` - HTTP server (underlying `@wolfstar/http-framework`)

## Troubleshooting

- **Build issues:** Run `pnpm clean` then `pnpm build`
- **Prisma types stale:** Run `pnpm prisma:generate` after schema changes
- **Command not appearing:** Commands auto-register on startup via
  `@wolfstar/shared-http-pieces`; check Discord developer portal
- **API auth failing:** Verify bearer tokens in `.env` match
  `INTERNAL_API_STARYL_TOKEN` and `INTERNAL_API_WOLFSTAR_TOKEN`
- **Staryl limit mismatch:** Ensure `LimitDefinitions` in Ring matches
  `RingLimits` / `DefaultLimits` in Staryl's `src/lib/utilities/ring.ts`

**When in doubt:** Copy existing patterns from similar files (e.g.,
`src/commands/`, `src/api/routes/`) before inventing new ones.
