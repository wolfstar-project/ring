import type { ResolveEntityType, ResolveOptions, ResolveResult } from "./types";
import { container } from "@sapphire/pieces";
import { computePosition } from "./hash";
import { ExperimentBucket } from "./types";

/// Resolves the bucket for an entity in an experiment.
///
/// Resolution order (see the Experiment Resolution Flow diagram):
/// `disabled → expired → override → hash`.
export async function resolveExperiment(
	experimentKey: string,
	entityType: ResolveEntityType,
	entityId: string,
	options: ResolveOptions = {},
): Promise<ResolveResult> {
	const botId = options.botId ?? null;

	// Step 1 — find the experiment matching the key within the bot scope. The
	// key is the primary key, so at most one row matches; the `botId` guard
	// ensures a bot-scoped flag does not leak to other bots, while global flags
	// (`botId: null`) apply everywhere.
	const experiment = await container.prisma.experiment.findFirst({
		where: { id: experimentKey, OR: [{ botId }, { botId: null }] },
	});

	if (!experiment?.enabled) {
		return { bucket: ExperimentBucket.NotEligible, source: "disabled" };
	}

	// Step 1b — entity-type scope guard. A GUILD- or USER-scoped experiment must
	// only resolve for the matching entity class (`BOTH` matches either).
	// Without this, a scope mismatch would skip the override lookup below and
	// fall through to a hash assignment for the wrong class of entity.
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
		return { bucket: toBucket(override.bucket), source: "override" };
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
function toBucket(value: number): ExperimentBucket {
	switch (value) {
		case ExperimentBucket.Eligible:
			return ExperimentBucket.Eligible;
		case ExperimentBucket.Override:
			return ExperimentBucket.Override;
		default:
			return ExperimentBucket.NotEligible;
	}
}
