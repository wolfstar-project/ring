export interface BuildExperimentKeyOptions {
	category: string;
	name: string;
	/// When set, the bot scope is embedded into the key for cross-bot clarity.
	botId?: string | null;
	/// Defaults to the current date. The UTC date is always used.
	date?: Date;
}

/// Lowercases, trims, and kebab-cases an arbitrary string for use in keys.
export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/// Builds the immutable experiment key.
///
/// - Global: `{YYYYMMDD}-{category}-{slug(name)}`
/// - Bot-scoped: `{YYYYMMDD}-{slug(botId)}-{category}-{slug(name)}`
export function buildExperimentKey(options: BuildExperimentKeyOptions): string {
	const { category, name, botId, date = new Date() } = options;
	const datePart = formatUtcDate(date);
	const categoryPart = slugify(category);
	const namePart = slugify(name);

	const segments = botId
		? [datePart, slugify(botId), categoryPart, namePart]
		: [datePart, categoryPart, namePart];

	return segments.join("-");
}

function formatUtcDate(date: Date): string {
	const year = date.getUTCFullYear().toString().padStart(4, "0");
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	return `${year}${month}${day}`;
}
