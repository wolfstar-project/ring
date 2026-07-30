# Core Requirements

- The end goal is stability, speed, and reliability.
- Ring is a private centralized management android for the WolfStar Network,
  built with TypeScript. It uses HTTP interactions via Discord's HTTP-based bot
  architecture (`@wolfstar/http-framework`) rather than a persistent WebSocket
  connection. It exposes internal REST API endpoints via `@wolfstar/plugin-api`
  for other bots in the network to query guild configuration.
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
| Directories      | kebab-case      | `routes/`                           |
| TypeScript files | camelCase       | `config.ts`                         |
| Variables        | camelCase       | `guildId`, `mappings`               |
| Constants        | PascalCase enum | `Mappings.staryl`                   |
| Path constants   | PascalCase      | `PathRoot`, `PathSrc`               |
| Types/Interfaces | PascalCase      | `Guild`, `SetOptions`               |
| Classes          | PascalCase      | `UserCommand`                       |
| Enum members     | PascalCase      | `PermissionFlagsBits.Administrator` |
| Private methods  | `#`-prefixed    | `this.#validate()`                  |

## Import Conventions

- Use TypeScript path mapping aliases for internal imports: `#lib/*`,
  `#common/*`, `#types`
- Use `type` imports for type-only values: `import type { ... } from "..."`
- Group imports: type imports first, then internal aliases, then external
  packages
- Prefer importing from barrel files over deep paths

## Project Architecture

### Key Patterns

- **HTTP Framework**: Built on `@wolfstar/http-framework`, handling Discord
  interactions via HTTP endpoints instead of WebSocket gateway
- **Internal API**: `@wolfstar/plugin-api` REST endpoints (`src/routes/`) that
  serve guild configuration data to other bots in the WolfStar Network (Staryl,
  WolfStar), authenticated via bearer tokens. Routes are `Route` pieces
  auto-loaded from `src/routes/`, with the path/method inferred from file
  location (folder segments, `[param]` dynamic segments, and a `.<method>`
  filename suffix)
- **Guild limits**: Canonical defaults, ranges, and bot mappings live in
  `src/lib/common/limits.ts` (`LimitDefinitions`, `Mappings`, `getMappings`)
- **Database**: PostgreSQL with Prisma ORM. Models use `@@map()` for snake_case
  table names, `@map()` for snake_case column names. Prisma `@default()` values
  must stay in sync with `LimitDefinitions`
- **i18n**: Multi-language support via `@wolfstar/http-framework-i18n` with
  locale JSON files in `src/locales/`
- **Container Pattern**: Services (Prisma, the `@wolfstar/plugin-api` API
  server, Logger) are attached to `container` from `@sapphire/pieces` with
  corresponding type augmentations

### Directory Structure

- `src/main.ts` - Application entry point
- `src/routes/` - Internal REST API endpoints (guild config queries),
  auto-loaded as `@wolfstar/plugin-api` `Route` pieces
- `src/commands/` - Discord slash commands using decorator pattern
- `src/lib/setup/` - Application initialization (env, Prisma, logger)
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

Routes are `Route` pieces loaded from `src/routes/`. The path and method are
inferred from the file's location: folder segments become path segments,
`[param]` folders become dynamic segments, `index` collapses into its parent,
and a `.<method>` filename suffix selects the HTTP method (e.g.
`src/routes/guilds/[id].get.ts` registers `GET /guilds/[id]`):

```typescript
import { requireMapping } from "#lib/api/auth";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route, type ApiRequest, type ApiResponse } from "@wolfstar/plugin-api";

export class ExampleRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "example-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

		response.json({ success: true }, HttpCodes.OK);
	}
}
```

Two non-obvious gotchas:

- **Status codes go through `response.json(body, statusCode)`, not
  `response.status(code).json(body)`.** `ApiResponse#json()` defaults its
  `statusCode` parameter to `HttpCodes.OK`, so chaining `.status(x).json(y)`
  silently overwrites `x` back to 200 — this fails with no error, only a wrong
  status code on the wire.
- **Every route needs an explicit unique `name`.** `@sapphire/pieces` keys its
  route store by filename alone (not full path), so two files named e.g.
  `index.get.ts` in different directories collide — the later-loaded one
  silently wins and the other's route never gets registered (no error, no
  warning, the endpoint just 405s). Pass `{ name: "<unique-slug>" }` in the
  constructor's `super()` call for every route file, as shown above.

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
- `@wolfstar/plugin-api` - Standalone REST API server plugin (`Route`/
  `Middleware` pieces) for `@wolfstar/http-framework`
- `@wolfstar/http-framework-i18n` - Internationalization for the HTTP framework
- `@wolfstar/shared-http-pieces` - Shared command registration and Sentry
  integration
- `@sapphire/result` - Rust-like Result type for error handling
- `@sapphire/utilities` - General utilities (`cast`, `isNullish`,
  `isNullishOrEmpty`)
- `@discordjs/builders` - Discord slash command option builders
- `@prisma/client` - Database ORM

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
`src/commands/`, `src/routes/`) before inventing new ones.
