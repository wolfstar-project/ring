import { GuildManager } from "#lib/guilds";
import { container } from "@sapphire/pieces";

const guilds = new GuildManager();
container.guilds = guilds;

declare module "@sapphire/pieces" {
	interface Container {
		guilds: GuildManager;
	}
}
