import type { Prisma } from "#generated/prisma";
import { ExperimentBucket, buildExperimentKey } from "#lib/experiments";
import {
	SlashCommandIntegerOption,
	SlashCommandStringOption,
} from "@discordjs/builders";
import { codeBlock, isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { envParseArray } from "@wolfstar/env-utilities";
import {
	Command,
	RegisterCommand,
	RegisterSubcommand,
} from "@wolfstar/http-framework";
import { ApplicationIntegrationType, MessageFlags } from "discord-api-types/v10";

const Categories = [
	"moderation",
	"leveling",
	"welcome",
	"logging",
	"custom",
] as const;

const ExperimentsPerPage = 10;

@RegisterCommand((builder) =>
	builder
		.setName("experiments")
		.setDescription("Manage WolfStar Network feature-flag experiments")
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
		// Owner-only command (every subcommand is gated by `isOwner`). `0n`
		// hides it from the Discord client UI for all non-admin members instead
		// of advertising it to anyone with Manage Guild and rejecting at runtime.
		.setDefaultMemberPermissions(0n),
)
export class UserCommand extends Command {
	@RegisterSubcommand((builder) =>
		builder
			.setName("create")
			.setDescription("Creates a new experiment")
			.addStringOption(getNameOption(true))
			.addStringOption(getCategoryOption())
			.addStringOption(getEntityTypeOption(true))
			.addStringOption(getDescriptionOption())
			.addIntegerOption(getRolloutOption())
			.addStringOption(
				getDateOption("start-date", "When the experiment starts"),
			)
			.addStringOption(getDateOption("end-date", "When the experiment ends"))
			.addStringOption(getBotIdOption()),
	)
	public async create(
		interaction: Command.ChatInputInteraction,
		options: CreateOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		const startDate = parseDate(options["start-date"]);
		const endDate = parseDate(options["end-date"]);
		if (startDate === Invalid || endDate === Invalid) {
			return this.reply(interaction, "One of the provided dates is invalid.");
		}
		if (startDate && endDate && endDate < startDate) {
			return this.reply(
				interaction,
				"The end date cannot be before the start date.",
			);
		}

		const botId = normalizeOptional(options["bot-id"]);
		const id = buildExperimentKey({
			category: options.category,
			name: options.name,
			botId,
		});

		try {
			await this.container.prisma.experiment.create({
				data: {
					id,
					name: options.name,
					description: normalizeOptional(options.description) ?? null,
					category: options.category,
					entityType: toEntityType(options["entity-type"]),
					rollout: toRollout(options.rollout),
					startDate,
					endDate,
					createdBy: interaction.user.id,
					botId: botId ?? null,
				},
			});
		} catch (error) {
			this.container.logger.error(error);
			return this.reply(
				interaction,
				`I could not create the experiment. A flag with the key \`${id}\` may already exist.`,
			);
		}

		return this.reply(interaction, `Created experiment \`${id}\`.`);
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("edit")
			.setDescription("Edits an existing experiment")
			.addStringOption(getExperimentOption())
			.addStringOption(getNameOption(false))
			.addStringOption(getDescriptionOption())
			.addIntegerOption(getRolloutOption())
			.addBooleanOption((option) =>
				option
					.setName("enabled")
					.setDescription("Toggle the experiment on or off"),
			)
			.addStringOption(
				getDateOption("end-date", "Update the expiry date", true),
			),
	)
	public async edit(
		interaction: Command.ChatInputInteraction,
		options: EditOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		const endDate = parseEditableDate(options["end-date"]);
		if (endDate === Invalid) {
			return this.reply(interaction, "The provided end date is invalid.");
		}

		// A concrete new end date must not fall before the stored start date,
		// which would invert the schedule window (expired before it starts).
		if (endDate instanceof Date) {
			const existing = await this.container.prisma.experiment.findUnique({
				where: { id: options.experiment },
				select: { startDate: true },
			});
			if (isNullish(existing)) {
				return this.reply(
					interaction,
					`I could not edit \`${options.experiment}\`; it may not exist.`,
				);
			}
			if (existing.startDate && endDate < existing.startDate) {
				return this.reply(
					interaction,
					"The end date cannot be before the experiment's start date.",
				);
			}
		}

		const data: Prisma.ExperimentUpdateInput = {
			name: normalizeOptional(options.name),
			description: normalizeOptional(options.description),
			rollout: isNullish(options.rollout)
				? undefined
				: toRollout(options.rollout),
			enabled: options.enabled,
			endDate,
		};

		try {
			await this.container.prisma.experiment.update({
				where: { id: options.experiment },
				data,
			});
		} catch (error) {
			this.container.logger.error(error);
			return this.reply(
				interaction,
				`I could not edit \`${options.experiment}\`; it may not exist.`,
			);
		}

		return this.reply(
			interaction,
			`Updated experiment \`${options.experiment}\`.`,
		);
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("delete")
			.setDescription("Permanently deletes an experiment and its overrides")
			.addStringOption(getExperimentOption())
			.addStringOption((option) =>
				option
					.setName("confirm")
					.setDescription("Type the experiment key exactly to confirm")
					.setRequired(true),
			),
	)
	public async delete(
		interaction: Command.ChatInputInteraction,
		options: DeleteOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		if (options.confirm !== options.experiment) {
			return this.reply(
				interaction,
				"The confirmation does not match the experiment key. Deletion aborted.",
			);
		}

		try {
			await this.container.prisma.experiment.delete({
				where: { id: options.experiment },
			});
		} catch (error) {
			this.container.logger.error(error);
			return this.reply(
				interaction,
				`I could not delete \`${options.experiment}\`; it may not exist.`,
			);
		}

		return this.reply(
			interaction,
			`Deleted experiment \`${options.experiment}\`.`,
		);
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("override")
			.setDescription("Sets or removes a manual override for a guild or user")
			.addStringOption(getExperimentOption())
			.addStringOption((option) =>
				option
					.setName("action")
					.setDescription("Whether to set or remove the override")
					.setRequired(true)
					.addChoices(
						{ name: "Set", value: "set" },
						{ name: "Remove", value: "remove" },
					),
			)
			.addStringOption((option) =>
				option
					.setName("entity-type")
					.setDescription("Whether the override targets a guild or a user")
					.setRequired(true)
					.addChoices(
						{ name: "Guild", value: "guild" },
						{ name: "User", value: "user" },
					),
			)
			.addStringOption((option) =>
				option
					.setName("entity-id")
					.setDescription("The Discord guild ID or user ID")
					.setMinLength(17)
					.setMaxLength(20)
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName("bucket")
					.setDescription("The bucket to force (required when setting)")
					.addChoices(
						{ name: "Eligible (0)", value: "eligible" },
						{ name: "Not Eligible (1)", value: "not-eligible" },
						{ name: "Override (2)", value: "override" },
					),
			)
			.addStringOption((option) =>
				option.setName("reason").setDescription("Audit trail note"),
			),
	)
	public async override(
		interaction: Command.ChatInputInteraction,
		options: OverrideOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		const entityType = options["entity-type"] === "guild" ? "GUILD" : "USER";
		const entityId = options["entity-id"];
		const where = {
			experimentId_entityType_entityId: {
				experimentId: options.experiment,
				entityType,
				entityId,
			},
		};

		if (options.action === "remove") {
			const { count } =
				await this.container.prisma.experimentOverride.deleteMany({
					where: { experimentId: options.experiment, entityType, entityId },
				});
			const content =
				count === 0
					? "There was no override to remove."
					: `Removed the override for \`${entityId}\`.`;
			return this.reply(interaction, content);
		}

		const bucket = toBucketValue(options.bucket);
		if (bucket === null) {
			return this.reply(
				interaction,
				"A bucket is required when setting an override.",
			);
		}

		// Reject overrides whose entity type does not match the experiment's
		// scope: the resolver's scope guard would never look them up, so they
		// would silently never apply. `BOTH` accepts either entity type.
		const experiment = await this.container.prisma.experiment.findUnique({
			where: { id: options.experiment },
			select: { entityType: true },
		});
		if (isNullish(experiment)) {
			return this.reply(
				interaction,
				`\`${options.experiment}\` does not exist.`,
			);
		}
		if (
			experiment.entityType !== "BOTH" &&
			experiment.entityType !== entityType
		) {
			return this.reply(
				interaction,
				`This experiment targets ${experiment.entityType.toLowerCase()} entities; a ${options["entity-type"]} override would never apply.`,
			);
		}

		try {
			await this.container.prisma.experimentOverride.upsert({
				where,
				create: {
					experimentId: options.experiment,
					entityType,
					entityId,
					bucket,
					reason: normalizeOptional(options.reason) ?? null,
					createdBy: interaction.user.id,
				},
				update: {
					bucket,
					reason: normalizeOptional(options.reason) ?? null,
					createdBy: interaction.user.id,
				},
			});
		} catch (error) {
			this.container.logger.error(error);
			return this.reply(
				interaction,
				`I could not set the override; \`${options.experiment}\` may not exist.`,
			);
		}

		return this.reply(
			interaction,
			`Set override for \`${entityId}\` on \`${options.experiment}\`.`,
		);
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("list")
			.setDescription("Lists experiments with optional filters")
			.addStringOption(getCategoryFilterOption())
			.addStringOption((option) =>
				option
					.setName("status")
					.setDescription("Filter by status")
					.addChoices(
						{ name: "Active", value: "active" },
						{ name: "Disabled", value: "disabled" },
						{ name: "Expired", value: "expired" },
						{ name: "All", value: "all" },
					),
			)
			.addStringOption(getBotIdOption())
			.addIntegerOption((option) =>
				option
					.setName("page")
					.setDescription("Page number (10 results per page)")
					.setMinValue(1),
			),
	)
	public async list(
		interaction: Command.ChatInputInteraction,
		options: ListOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		const now = new Date();
		const where: Prisma.ExperimentWhereInput = {};
		if (!isNullishOrEmpty(options.category)) where.category = options.category;
		if (!isNullishOrEmpty(options["bot-id"])) where.botId = options["bot-id"];

		switch (options.status) {
			case "disabled":
				where.enabled = false;
				break;
			case "expired":
				where.endDate = { lt: now };
				break;
			case "active":
				where.enabled = true;
				where.AND = [
					{ OR: [{ startDate: null }, { startDate: { lte: now } }] },
					{ OR: [{ endDate: null }, { endDate: { gte: now } }] },
				];
				break;
			default:
				break;
		}

		const page = Math.max(1, options.page ?? 1);
		const [total, experiments] = await Promise.all([
			this.container.prisma.experiment.count({ where }),
			this.container.prisma.experiment.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * ExperimentsPerPage,
				take: ExperimentsPerPage,
			}),
		]);

		const totalPages = Math.max(1, Math.ceil(total / ExperimentsPerPage));

		if (experiments.length === 0) {
			if (total === 0) {
				return this.reply(interaction, "No experiments matched those filters.");
			}
			return this.reply(
				interaction,
				`No experiments on page ${page} of ${totalPages}.`,
			);
		}

		const lines = experiments.map((experiment) => {
			const scope = experiment.botId ?? "global";
			const state = experiment.enabled ? "on" : "off";
			const rollout = formatRolloutPercent(experiment.rollout);
			return `${experiment.id} [${state}, ${rollout}, ${scope}]`;
		});
		const header = `Page ${page}/${totalPages} (${total} experiment${total === 1 ? "" : "s"})`;
		return this.reply(interaction, codeBlock([header, ...lines].join("\n")));
	}

	@RegisterSubcommand((builder) =>
		builder
			.setName("info")
			.setDescription("Shows full details for a single experiment")
			.addStringOption(getExperimentOption()),
	)
	public async info(
		interaction: Command.ChatInputInteraction,
		options: InfoOptions,
	) {
		if (!this.isOwner(interaction)) return this.denied(interaction);

		const experiment = await this.container.prisma.experiment.findUnique({
			where: { id: options.experiment },
		});
		if (isNullish(experiment)) {
			return this.reply(interaction, "That experiment does not exist.");
		}

		const overrideCount = await this.container.prisma.experimentOverride.count({
			where: { experimentId: experiment.id },
		});

		const lines = [
			`Key         : ${experiment.id}`,
			`Name        : ${experiment.name}`,
			`Category    : ${experiment.category}`,
			`Entity type : ${experiment.entityType}`,
			`Rollout     : ${formatRolloutPercent(experiment.rollout)} (${experiment.rollout}/10000)`,
			`Enabled     : ${experiment.enabled ? "yes" : "no"}`,
			`Bot scope   : ${experiment.botId ?? "global"}`,
			`Starts      : ${experiment.startDate?.toISOString() ?? "—"}`,
			`Ends        : ${experiment.endDate?.toISOString() ?? "—"}`,
			`Overrides   : ${overrideCount}`,
		];
		if (!isNullishOrEmpty(experiment.description)) {
			lines.push(`Description : ${experiment.description}`);
		}
		return this.reply(interaction, codeBlock(lines.join("\n")));
	}

	private isOwner(interaction: Command.ChatInputInteraction): boolean {
		return UserCommand.ClientOwners.includes(interaction.user.id);
	}

	private denied(interaction: Command.ChatInputInteraction) {
		return this.reply(interaction, "You cannot use this command.");
	}

	private reply(interaction: Command.ChatInputInteraction, content: string) {
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private static readonly ClientOwners = envParseArray("CLIENT_OWNERS");
}

interface CreateOptions {
	name: string;
	category: (typeof Categories)[number];
	"entity-type": string;
	description?: string;
	rollout?: number;
	"start-date"?: string;
	"end-date"?: string;
	"bot-id"?: string;
}

interface EditOptions {
	experiment: string;
	name?: string;
	description?: string;
	rollout?: number;
	enabled?: boolean;
	"end-date"?: string;
}

interface DeleteOptions {
	experiment: string;
	confirm: string;
}

interface OverrideOptions {
	experiment: string;
	action: "set" | "remove";
	"entity-type": string;
	"entity-id": string;
	bucket?: string;
	reason?: string;
}

interface ListOptions {
	category?: string;
	status?: "active" | "disabled" | "expired" | "all";
	"bot-id"?: string;
	page?: number;
}

interface InfoOptions {
	experiment: string;
}

const Invalid = Symbol("invalid-date");

/// Returns `undefined` when absent, the `Invalid` sentinel when unparseable, or
/// the parsed `Date`.
function parseDate(input?: string): Date | typeof Invalid | undefined {
	if (isNullishOrEmpty(input)) return undefined;
	const date = new Date(input);
	return Number.isNaN(date.getTime()) ? Invalid : date;
}

/// Like `parseDate`, but also accepts the sentinels `none`/`clear`, returning
/// `null` so `edit` can remove a previously set date. Absent input still
/// returns `undefined`, which Prisma leaves unchanged.
function parseEditableDate(
	input?: string,
): Date | null | typeof Invalid | undefined {
	const normalized = input?.trim().toLowerCase();
	if (normalized === "none" || normalized === "clear") return null;
	return parseDate(input);
}

function normalizeOptional(value?: string): string | undefined {
	return isNullishOrEmpty(value) ? undefined : value;
}

function toEntityType(value: string): "GUILD" | "USER" | "BOTH" {
	if (value === "user") return "USER";
	if (value === "both") return "BOTH";
	return "GUILD";
}

function toRollout(percent?: number): number {
	if (isNullish(percent)) return 0;
	return Math.max(0, Math.min(100, percent)) * 100;
}

/// Formats a 0-10000 rollout as an exact percentage (e.g. `0.5%`, `50%`),
/// avoiding the precision loss of rounding to whole percents.
function formatRolloutPercent(rollout: number): string {
	return `${rollout / 100}%`;
}

function toBucketValue(value?: string): ExperimentBucket | null {
	switch (value) {
		case "eligible":
			return ExperimentBucket.Eligible;
		case "not-eligible":
			return ExperimentBucket.NotEligible;
		case "override":
			return ExperimentBucket.Override;
		default:
			return null;
	}
}

function getNameOption(required: boolean) {
	return () =>
		new SlashCommandStringOption()
			.setName("name")
			.setDescription("Human-readable display name")
			.setMaxLength(100)
			.setRequired(required);
}

function getDescriptionOption() {
	return () =>
		new SlashCommandStringOption()
			.setName("description")
			.setDescription("What this experiment tests")
			.setMaxLength(500);
}

function getCategoryOption() {
	return () =>
		new SlashCommandStringOption()
			.setName("category")
			.setDescription("Feature category")
			.setRequired(true)
			.addChoices(...Categories.map((value) => ({ name: value, value })));
}

function getCategoryFilterOption() {
	return () =>
		new SlashCommandStringOption()
			.setName("category")
			.setDescription("Filter by category")
			.addChoices(...Categories.map((value) => ({ name: value, value })));
}

function getEntityTypeOption(required: boolean) {
	return () =>
		new SlashCommandStringOption()
			.setName("entity-type")
			.setDescription("Whether this flag targets guilds, users, or both")
			.setRequired(required)
			.addChoices(
				{ name: "Guild", value: "guild" },
				{ name: "User", value: "user" },
				{ name: "Both", value: "both" },
			);
}

function getRolloutOption() {
	return () =>
		new SlashCommandIntegerOption()
			.setName("rollout")
			.setDescription("Rollout percentage (0-100)")
			.setMinValue(0)
			.setMaxValue(100);
}

function getDateOption(name: string, description: string, clearable = false) {
	return () =>
		new SlashCommandStringOption()
			.setName(name)
			.setDescription(
				clearable
					? `${description} (ISO 8601, or "none" to clear)`
					: `${description} (ISO 8601)`,
			);
}

function getBotIdOption() {
	return () =>
		new SlashCommandStringOption()
			.setName("bot-id")
			.setDescription("Scope to a specific bot; leave empty for global")
			.setMaxLength(32);
}

function getExperimentOption() {
	return () =>
		new SlashCommandStringOption()
			.setName("experiment")
			.setDescription("The experiment key")
			.setRequired(true);
}
