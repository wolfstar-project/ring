import type { Experiment, ExperimentOverride, Prisma } from "#generated/prisma";
import type { ResolveEntityType, ResolveOptions, ResolveResult } from "./types";
import { container } from "@sapphire/pieces";
import { computePosition } from "./hash";
import { ExperimentBucket } from "./types";

/// Whether an override row targets a guild or a user, mirroring the Prisma enum.
export type ExperimentEntityType = "GUILD" | "USER";

export interface ListExperimentsOptions {
	where?: Prisma.ExperimentWhereInput;
	skip?: number;
	take?: number;
}

export interface SetOverrideOptions {
	experimentId: string;
	entityType: ExperimentEntityType;
	entityId: string;
	bucket: ExperimentBucket;
	reason?: string | null;
	createdBy: string;
}

/// Central data-access and resolution gateway for feature-flag experiments.
///
/// All experiment persistence flows through this manager so commands, routes,
/// and the resolver never touch `container.prisma` directly. The instance is
/// attached to the container as `container.experiments` (see
/// `src/lib/setup/experiments.ts`).
export class ExperimentManager {
	/// Persists a brand-new experiment row.
	public create(data: Prisma.ExperimentCreateInput): Promise<Experiment> {
		return container.prisma.experiment.create({ data });
	}

	/// Applies a partial update to an existing experiment.
	public update(
		id: string,
		data: Prisma.ExperimentUpdateInput,
	): Promise<Experiment> {
		return container.prisma.experiment.update({ where: { id }, data });
	}

	/// Permanently deletes an experiment (overrides cascade via the schema).
	public delete(id: string): Promise<Experiment> {
		return container.prisma.experiment.delete({ where: { id } });
	}

	/// Fetches a single experiment by key, or `null` when absent.
	public findById(id: string): Promise<Experiment | null> {
		return container.prisma.experiment.findUnique({ where: { id } });
	}

	/// Counts experiments matching the given filter.
	public count(where: Prisma.ExperimentWhereInput = {}): Promise<number> {
		return container.prisma.experiment.count({ where });
	}

	/// Lists experiments newest-first, honouring optional pagination.
	public list(options: ListExperimentsOptions = {}): Promise<Experiment[]> {
		const { where = {}, skip, take } = options;
		return container.prisma.experiment.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take,
		});
	}

	/// Counts the manual overrides attached to an experiment.
	public countOverrides(experimentId: string): Promise<number> {
		return container.prisma.experimentOverride.count({
			where: { experimentId },
		});
	}

	/// Creates or updates a manual override for a guild or user.
	public setOverride(options: SetOverrideOptions): Promise<ExperimentOverride> {
		const { experimentId, entityType, entityId, bucket, reason, createdBy } =
			options;
		return container.prisma.experimentOverride.upsert({
			where: {
				experimentId_entityType_entityId: {
					experimentId,
					entityType,
					entityId,
				},
			},
			create: {
				experimentId,
				entityType,
				entityId,
				bucket,
				reason: reason ?? null,
				createdBy,
			},
			update: { bucket, reason: reason ?? null, createdBy },
		});
	}

	/// Removes any matching override, returning how many rows were deleted.
	public async removeOverride(
		experimentId: string,
		entityType: ExperimentEntityType,
		entityId: string,
	): Promise<number> {
		const { count } = await container.prisma.experimentOverride.deleteMany({
			where: { experimentId, entityType, entityId },
		});
		return count;
	}

	/// Resolves the bucket for an entity in an experiment.
	///
	/// Resolution order (see the Experiment Resolution Flow diagram):
	/// `disabled → expired → override → hash`.
	public async resolve(
		experimentKey: string,
		entityType: ResolveEntityType,
		entityId: string,
		options: ResolveOptions = {},
	): Promise<ResolveResult> {
		const botId = options.botId ?? null;

		// Step 1 — find the experiment matching the key within the bot scope. The
		// key is the primary key, so at most one row matches; the `botId` guard
		// ensures a bot-scoped flag does not leak to other bots, while global
		// flags (`botId: null`) apply everywhere.
		const experiment = await container.prisma.experiment.findFirst({
			where: { id: experimentKey, OR: [{ botId }, { botId: null }] },
		});

		if (!experiment?.enabled) {
			return { bucket: ExperimentBucket.NotEligible, source: "disabled" };
		}

		// Step 1b — entity-type scope guard. A GUILD- or USER-scoped experiment
		// must only resolve for the matching entity class (`BOTH` matches
		// either). Without this, a scope mismatch would skip the override lookup
		// below and fall through to a hash assignment for the wrong class of
		// entity.
		const entityTypeEnum = entityType === "guild" ? "GUILD" : "USER";
		if (
			experiment.entityType !== "BOTH" &&
			experiment.entityType !== entityTypeEnum
		) {
			return { bucket: ExperimentBucket.NotEligible, source: "disabled" };
		}

		// Step 2 — scheduling window.
		const now = new Date();
		if (experiment.startDate && experiment.startDate > now) {
			return { bucket: ExperimentBucket.NotEligible, source: "disabled" };
		}
		if (experiment.endDate && experiment.endDate < now) {
			return { bucket: ExperimentBucket.NotEligible, source: "expired" };
		}

		// Step 3 — manual override (highest priority after active/expired).
		const override = await container.prisma.experimentOverride.findUnique({
			where: {
				experimentId_entityType_entityId: {
					experimentId: experimentKey,
					entityType: entityTypeEnum,
					entityId,
				},
			},
		});

		if (override) {
			return {
				bucket: ExperimentManager.#toBucket(override.bucket),
				source: "override",
			};
		}

		// Step 4 — hash-based rollout assignment.
		const position = computePosition(experimentKey, entityId);
		const bucket =
			position < experiment.rollout
				? ExperimentBucket.Eligible
				: ExperimentBucket.NotEligible;
		return { bucket, source: "hash" };
	}

	/// Narrows a stored integer to a known bucket, defaulting unknowns to
	/// `NotEligible` so a corrupt row can never accidentally enable a feature.
	static #toBucket(value: number): ExperimentBucket {
		switch (value) {
			case ExperimentBucket.Eligible:
				return ExperimentBucket.Eligible;
			case ExperimentBucket.Override:
				return ExperimentBucket.Override;
			default:
				return ExperimentBucket.NotEligible;
		}
	}
}
