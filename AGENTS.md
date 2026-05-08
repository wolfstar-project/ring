# Core Requirements

- The end goal is stability, speed, and reliability.
- Ring is a private centralized management android for the WolfStar Network,
  built with TypeScript. It uses HTTP interactions via Discord's HTTP-based bot
  architecture (`@skyra/http-framework`) rather than a persistent WebSocket
  connection. It exposes internal REST API endpoints via Fastify for other bots
  in the network to query guild configuration.
- Always reference these instructions first and fall back to search or
  documentation queries only when you encounter unexpected information.

## Code Quality Requirements

- Follow standard TypeScript conventions and best practices with strict mode
- Use the `@skyra/http-framework` decorator pattern (`@RegisterCommand`,
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

- Use TypeScript path mapping aliases for internal imports: `#lib/*`, `#api/*`
- Use `type` imports for type-only values: `import type { ... } from "..."`
- Group imports: type imports first, then internal aliases, then external
  packages
- Prefer importing from barrel files over deep paths

## Command Patterns

- Commands live in `src/commands/` as a single file per command
- Always use `@RegisterCommand` on the class and `@RegisterSubcommand` on each
  subcommand method
- Use `Command.ChatInputInteraction` for interaction parameters and a typed
  `Options` interface for options
- Guard owner-only commands with an `interaction.user.id` check against
  `envParseArray("CLIENT_OWNERS")`
- Reply with `MessageFlags.Ephemeral` for sensitive or admin-only responses

```typescript
@RegisterCommand((builder) =>
	builder
		.setName("command-name")
		.setDescription("Description")
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
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

## API Route Patterns

- Internal REST routes live in `src/api/routes/` and are loaded via
  `src/api/routes/_load.ts`
- Routes are registered directly on `container.server` (the Fastify instance)
- Always validate the `Authorization` header first; return `401` for missing and
  `403` for invalid tokens
- Resolve tokens to permission mappings via a `const Mappings` object; the
  switch block returns `null` for unknown tokens
- Use `@@map()` / `@map()` in the Prisma schema for snake_case column names;
  access via `container.prisma`

```typescript
container.server.route({
	url: "/guilds/:id",
	method: "GET",
	handler: async (request, reply) => {
		if (isNullishOrEmpty(request.headers.authorization)) {
			return reply
				.code(401)
				.send({ success: false, message: "Missing authorization" });
		}

		const mappings = getMappings(request.headers.authorization);
		if (!mappings) {
			return reply
				.code(403)
				.send({ success: false, message: "Missing access to this resource" });
		}
		// ...
	},
});
```

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm prisma:generate      # Regenerate Prisma client after schema changes
pnpm build                # Build TypeScript via tsdown
pnpm start                # Start the application
pnpm dev                  # Build + start
pnpm watch                # Watch mode for development
pnpm lint                 # Check lint and formatting (oxlint + oxfmt)
pnpm lint:fix             # Auto-fix lint and formatting issues
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

## Troubleshooting

- **Build issues:** Run `pnpm clean` then `pnpm build`
- **Prisma types stale:** Run `pnpm prisma:generate` after schema changes
- **Command not appearing:** Commands auto-register on startup via
  `@skyra/shared-http-pieces`; check Discord developer portal
- **API auth failing:** Verify bearer tokens in `.env` match
  `INTERNAL_API_STARYL_TOKEN` and `INTERNAL_API_WOLFSTAR_TOKEN`
- **Type errors after updates:** Run `pnpm prisma:generate` to refresh generated
  client types

**When in doubt:** Copy existing patterns from similar files (e.g.,
`src/commands/`, `src/api/routes/`) before inventing new ones.

## Plans Directory

`.atlas/plans/`
