import type { Guild, Prisma } from "#generated/prisma";
import { container } from "@sapphire/pieces";

export interface FindGuildOptions {
	select?: Prisma.GuildSelect;
}

/// Central data-access gateway for guild limit configuration.
///
/// Commands and API routes never touch `container.prisma` for guild rows
/// directly. The instance is attached to the container as `container.guilds`
/// (see `src/lib/setup/guilds.ts`).
export class GuildManager {
	/// Fetches a guild row by Discord snowflake, or `null` when absent.
	public findById(id: bigint): Promise<Guild | null>;
	public findById<S extends Prisma.GuildSelect>(
		id: bigint,
		options: { select: S },
	): Promise<Prisma.GuildGetPayload<{ select: S }> | null>;
	public findById(
		id: bigint,
		options: FindGuildOptions = {},
	): Promise<Guild | null> {
		const { select } = options;
		return container.prisma.guild.findFirst({
			where: { id },
			...(select ? { select } : {}),
		}) as Promise<Guild | null>;
	}

	/// Creates or updates limit fields for a guild.
	public upsert(
		id: bigint,
		data: Omit<Prisma.GuildCreateInput, "id">,
	): Promise<Guild> {
		return container.prisma.guild.upsert({
			where: { id },
			create: { id, ...data },
			update: data,
		});
	}

	/// Removes stored limits for a guild.
	public delete(id: bigint): Promise<Guild> {
		return container.prisma.guild.delete({ where: { id } });
	}
}
