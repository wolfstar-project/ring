export interface StarylLimits {
	maximumYouTubeSubscriptions: number;
	maximumTwitchSubscriptions: number;
}

export interface WolfstarLimits {
	maximumFilteredWords: number;
	maximumFilteredReactions: number;
	maximumAllowedLinks: number;
	maximumAllowedInviteCodes: number;
}

export type GuildLimits = StarylLimits & WolfstarLimits;

export type GuildLimitField = keyof GuildLimits;

export type BotMapping = "staryl" | "wolfstar";

export interface LimitDefinition {
	bot: BotMapping;
	default: number;
	min: number;
	max: number;
	label: string;
	description: string;
	optionName: string;
}

export interface BotLimitMapping<T extends Partial<GuildLimits>> {
	properties: { [K in keyof T]: true };
	defaults: T;
}
