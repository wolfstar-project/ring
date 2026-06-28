import type { GuildLimitField } from "#types/limits";
import {
	GuildLimitFields,
	LimitDefinitions,
	getAllDefaults,
} from "#common/limits";
import {
	SlashCommandIntegerOption,
	SlashCommandStringOption,
} from "@discordjs/builders";
import { codeBlock, isNullish } from "@sapphire/utilities";
import { envParseArray } from "@wolfstar/env-utilities";
import {
	Command,
	RegisterCommand,
	RegisterSubcommand,
} from "@wolfstar/http-framework";
import { blue, bold, red, yellow } from "@wolfstar/logger";
import {
	MessageFlags,
	PermissionFlagsBits,
	ApplicationIntegrationType,
} from "discord-api-types/v10";

@RegisterCommand((builder) =>
	builder
		.setName("config")
		.setDescription("Manage a guild's features")
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
)
export class UserCommand extends Command {
	@RegisterSubcommand((builder) => {
		builder
			.setName("get")
			.setDescription("Gets a guild's features")
			.addStringOption(getGuildOption);

		return builder;
	})
	public async get(
		interaction: Command.ChatInputInteraction,
		options: Options,
	) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({
				content: "You cannot use this command.",
				flags: MessageFlags.Ephemeral,
			});
		}

		const id = BigInt(options.guild);
		const data = await this.container.guilds.findById(id);
		const limits = data ?? { id, ...getAllDefaults() };

		const lines = [
			`${bold("Guild ID")}: ${bold(blue(limits.id.toString().padStart(19, " ")))}`,
			...GuildLimitFields.map((field) => {
				const definition = LimitDefinitions[field];
				return `${bold(definition.label.padEnd(29))}: ${formatRange(limits[field], definition.min, definition.max)}`;
			}),
		];
		return interaction.reply({
			content: codeBlock("ansi", lines.join("\n")),
			flags: MessageFlags.Ephemeral,
		});
	}

	@RegisterSubcommand((builder) => {
		builder
			.setName("set")
			.setDescription("Updates a guild's features")
			.addStringOption(getGuildOption);

		for (const field of GuildLimitFields) {
			const definition = LimitDefinitions[field];
			builder.addIntegerOption(
				getIntegerOption(
					definition.min,
					definition.max,
					definition.optionName,
					definition.description,
				),
			);
		}

		return builder;
	})
	public async set(
		interaction: Command.ChatInputInteraction,
		options: SetOptions,
	) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({
				content: "You cannot use this command.",
				flags: MessageFlags.Ephemeral,
			});
		}

		const id = BigInt(options.guild);
		const data = Object.fromEntries(
			GuildLimitFields.map((field) => [
				field,
				options[LimitDefinitions[field].optionName as keyof SetOptions],
			]),
		);
		try {
			await this.container.guilds.upsert(id, data);
			return interaction.reply({
				content: "Updated.",
				flags: MessageFlags.Ephemeral,
			});
		} catch (error) {
			this.container.logger.error(error);

			return interaction.reply({
				content:
					"I was not able to update the configuration, please check my logs and/or try again later.",
				flags: MessageFlags.Ephemeral,
			});
		}
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("reset")
			.setDescription("Resets a guild's features")
			.addStringOption(getGuildOption),
	)
	public async reset(
		interaction: Command.ChatInputInteraction,
		options: Options,
	) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({
				content: "You cannot use this command.",
				flags: MessageFlags.Ephemeral,
			});
		}

		const data = await this.container.guilds.delete(BigInt(options.guild));
		const content = isNullish(data)
			? "There is no data recorded for that guild."
			: "Successfully deleted the specified guild's data.";
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private static readonly ClientOwners = envParseArray("CLIENT_OWNERS");
}

interface Options {
	guild: string;
}

type SetOptionName = (typeof LimitDefinitions)[GuildLimitField]["optionName"];

type SetOptions = Options & {
	[K in SetOptionName]?: number;
};

function getGuildOption() {
	return new SlashCommandStringOption()
		.setName("guild")
		.setDescription("The ID of the guild to manage")
		.setMinLength(17)
		.setMaxLength(19)
		.setRequired(true);
}

function getIntegerOption(
	min: number,
	max: number,
	name: string,
	description: string,
) {
	return new SlashCommandIntegerOption()
		.setName(name)
		.setDescription(`${description} (${min}-${max})`)
		.setMinValue(min)
		.setMaxValue(max);
}

function formatRange(value: number, min: number, max: number) {
	if (value === min) return `${blue(format(value))} → ${red(format(max))}`;
	if (value === max) return `${yellow(format(min))} ← ${blue(format(value))}`;
	return `${yellow(format(min))} ← ${blue(format(value))} → ${red(format(max))}`;
}

function format(value: number) {
	return value.toString().padStart(3, " ");
}
