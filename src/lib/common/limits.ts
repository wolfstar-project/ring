import type {
	BotLimitMapping,
	BotMapping,
	GuildLimitField,
	GuildLimits,
	LimitDefinition,
	StarylLimits,
	WolfstarLimits,
} from "#types/limits";

export const LimitDefinitions = {
	maximumYouTubeSubscriptions: {
		bot: "staryl",
		default: 10,
		min: 10,
		max: 30,
		label: "Maximum YouTube Subscriptions",
		description: "(Staryl) The maximum amount of YouTube subscriptions",
		optionName: "maximum-youtube-subscriptions",
	},
	maximumTwitchSubscriptions: {
		bot: "staryl",
		default: 15,
		min: 15,
		max: 35,
		label: "Maximum Twitch Subscriptions",
		description: "(Staryl) The maximum amount of Twitch live subscriptions",
		optionName: "maximum-twitch-subscriptions",
	},
	maximumRedditSubscriptions: {
		bot: "staryl",
		default: 30,
		min: 30,
		max: 60,
		label: "Maximum Reddit Subscriptions",
		description: "(Staryl) The maximum amount of Reddit subscriptions",
		optionName: "maximum-reddit-subscriptions",
	},
	maximumFilteredWords: {
		bot: "wolfstar",
		default: 50,
		min: 50,
		max: 200,
		label: "Maximum Filtered Words",
		description: "(WolfStar) The maximum amount of filtered words",
		optionName: "maximum-filtered-words",
	},
	maximumFilteredReactions: {
		bot: "wolfstar",
		default: 50,
		min: 50,
		max: 200,
		label: "Maximum Filtered Reactions",
		description: "(WolfStar) The maximum amount of filtered reactions",
		optionName: "maximum-filtered-reactions",
	},
	maximumAllowedLinks: {
		bot: "wolfstar",
		default: 25,
		min: 25,
		max: 100,
		label: "Maximum Allowed Links",
		description: "(WolfStar) The maximum amount of allowed links",
		optionName: "maximum-allowed-links",
	},
	maximumAllowedInviteCodes: {
		bot: "wolfstar",
		default: 25,
		min: 25,
		max: 100,
		label: "Maximum Allowed Invite Codes",
		description: "(WolfStar) The maximum amount of allowed invite codes",
		optionName: "maximum-allowed-invite-codes",
	},
} as const satisfies Record<GuildLimitField, LimitDefinition>;

function buildBotMapping<T extends BotMapping>(
	bot: T,
): BotLimitMapping<T extends "staryl" ? StarylLimits : WolfstarLimits> {
	const entries = Object.entries(LimitDefinitions).filter(
		([, definition]) => definition.bot === bot,
	);

	const properties = Object.fromEntries(
		entries.map(([field]) => [field, true]),
	) as {
		[K in keyof (T extends "staryl" ? StarylLimits : WolfstarLimits)]: true;
	};

	const defaults = Object.fromEntries(
		entries.map(([field, definition]) => [field, definition.default]),
	) as T extends "staryl" ? StarylLimits : WolfstarLimits;

	return { properties, defaults };
}

export const Mappings = {
	staryl: buildBotMapping("staryl"),
	wolfstar: buildBotMapping("wolfstar"),
} as const;

export type Mapping = (typeof Mappings)[BotMapping];

export function getMappings(token: string): Mapping | null {
	switch (token) {
		case process.env.INTERNAL_API_STARYL_TOKEN:
			return Mappings.staryl;
		case process.env.INTERNAL_API_WOLFSTAR_TOKEN:
			return Mappings.wolfstar;
		default:
			return null;
	}
}

export function getAllDefaults(): GuildLimits {
	return Object.fromEntries(
		Object.entries(LimitDefinitions).map(([field, definition]) => [
			field,
			definition.default,
		]),
	) as GuildLimits;
}

export const GuildLimitFields = Object.keys(
	LimitDefinitions,
) as GuildLimitField[];

export const DefaultStarylLimits = Mappings.staryl.defaults;
export const DefaultWolfstarLimits = Mappings.wolfstar.defaults;
