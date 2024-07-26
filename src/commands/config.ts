import { SlashCommandIntegerOption, SlashCommandStringOption } from '@discordjs/builders';
import { codeBlock, isNullish } from '@sapphire/utilities';
import { envParseArray } from '@skyra/env-utilities';
import { Command, RegisterCommand, RegisterSubcommand } from '@skyra/http-framework';
import { blue, bold, red, yellow } from '@skyra/logger';
import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	builder
		.setName('config')
		.setDescription("Manage a guild's features")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
)
export class UserCommand extends Command {
	@RegisterSubcommand((builder) => builder.setName('get').setDescription("Gets a guild's features").addStringOption(getGuildOption))
	public async get(interaction: Command.ChatInputInteraction, options: Options) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({ content: 'You cannot use this command.', flags: MessageFlags.Ephemeral });
		}

		const data = await this.container.prisma.guild.findFirst({ where: { id: BigInt(options.guild) } });
		if (isNullish(data)) {
			return interaction.reply({ content: 'There is no data recorded for that guild.', flags: MessageFlags.Ephemeral });
		}

		const lines = [
			`${bold('Guild ID')}: ${bold(blue(data.id.toString().padStart(19, ' ')))}`,
			`${bold('Maximum YouTube Subscriptions')}: ${formatRange(data.maximumYouTubeSubscriptions, 3, 10)}`,
			`${bold('Maximum Twitch Subscriptions ')}: ${formatRange(data.maximumTwitchSubscriptions, 5, 20)}`,
			`${bold('Maximum Filtered Words       ')}: ${formatRange(data.maximumFilteredWords, 50, 200)}`,
			`${bold('Maximum Filtered Reactions   ')}: ${formatRange(data.maximumFilteredReactions, 50, 200)}`,
			`${bold('Maximum Allowed Links        ')}: ${formatRange(data.maximumAllowedLinks, 25, 100)}`,
			`${bold('Maximum Allowed Invite Codes ')}: ${formatRange(data.maximumAllowedInviteCodes, 25, 100)}`,
			`${bold('Maximum Tag Count            ')}: ${formatRange(data.maximumTagCount, 50, 200)}`
		];
		return interaction.reply({ content: codeBlock('ansi', lines.join('\n')), flags: MessageFlags.Ephemeral });
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName('set')
			.setDescription("Updates a guild's features")
			.addStringOption(getGuildOption)
			.addIntegerOption(getIntegerOption(3, 10, 'maximum-youtube-subscriptions', '(Acrysel) The maximum amount of YouTube subscriptions'))
			.addIntegerOption(getIntegerOption(5, 20, 'maximum-twitch-subscriptions', '(Acrysel) The maximum amount of Twitch subscriptions'))
			.addIntegerOption(getIntegerOption(50, 200, 'maximum-filtered-words', '(Skyra) The maximum amount of filtered words'))
			.addIntegerOption(getIntegerOption(50, 200, 'maximum-filtered-reactions', '(Skyra) The maximum amount of filtered reactions'))
			.addIntegerOption(getIntegerOption(25, 100, 'maximum-allowed-links', '(Skyra) The maximum amount of allowed links'))
			.addIntegerOption(getIntegerOption(25, 100, 'maximum-allowed-invite-codes', '(Skyra) The maximum amount of allowed invite codes'))
			.addIntegerOption(getIntegerOption(50, 200, 'maximum-tag-count', '(Teryl) The maximum amount of tags'))
	)
	public async set(interaction: Command.ChatInputInteraction, options: SetOptions) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({ content: 'You cannot use this command.', flags: MessageFlags.Ephemeral });
		}

		const id = BigInt(options.guild);
		const data = {
			maximumYouTubeSubscriptions: options['maximum-youtube-subscriptions'],
			maximumTwitchSubscriptions: options['maximum-twitch-subscriptions'],
			maximumFilteredWords: options['maximum-filtered-words'],
			maximumFilteredReactions: options['maximum-filtered-reactions'],
			maximumAllowedLinks: options['maximum-allowed-links'],
			maximumAllowedInviteCodes: options['maximum-allowed-invite-codes'],
			maximumTagCount: options['maximum-tag-count']
		};
		try {
			await this.container.prisma.guild.upsert({
				where: { id },
				create: { id, ...data },
				update: data
			});
			return interaction.reply({ content: 'Updated.', flags: MessageFlags.Ephemeral });
		} catch (error) {
			this.container.logger.error(error);

			return interaction.reply({
				content: 'I was not able to update the configuration, please check my logs and/or try again later.',
				flags: MessageFlags.Ephemeral
			});
		}
	}

	@RegisterSubcommand((builder) => builder.setName('reset').setDescription("Resets a guild's features").addStringOption(getGuildOption))
	public async reset(interaction: Command.ChatInputInteraction, options: Options) {
		if (!UserCommand.ClientOwners.includes(interaction.user.id)) {
			return interaction.reply({ content: 'You cannot use this command.', flags: MessageFlags.Ephemeral });
		}

		const data = await this.container.prisma.guild.delete({ where: { id: BigInt(options.guild) } });
		const content = isNullish(data) ? 'There is no data recorded for that guild.' : "Successfully deleted the specified guild's data.";
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private static readonly ClientOwners = envParseArray('CLIENT_OWNERS');
}

interface Options {
	guild: string;
}

interface SetOptions extends Options {
	'maximum-youtube-subscriptions'?: number;
	'maximum-twitch-subscriptions'?: number;
	'maximum-filtered-words'?: number;
	'maximum-filtered-reactions'?: number;
	'maximum-allowed-links'?: number;
	'maximum-allowed-invite-codes'?: number;
	'maximum-tag-count'?: number;
}

function getGuildOption() {
	return new SlashCommandStringOption()
		.setName('guild')
		.setDescription('The ID of the guild to manage')
		.setMinLength(17)
		.setMaxLength(19)
		.setRequired(true);
}

function getIntegerOption(min: number, max: number, name: string, description: string) {
	return new SlashCommandIntegerOption().setName(name).setDescription(`${description} (${min}-${max})`).setMinValue(min).setMaxValue(max);
}

function formatRange(value: number, min: number, max: number) {
	if (value === min) return `${blue(format(value))} → ${red(format(max))}`;
	if (value === max) return `${yellow(format(min))} ← ${blue(format(value))}`;
	return `${yellow(format(min))} ← ${blue(format(value))} → ${red(format(max))}`;
}

function format(value: number) {
	return value.toString().padStart(3, ' ');
}
