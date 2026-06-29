import type { ResolveEntityType, ResolveOptions, ResolveResult } from "./types";
import { container } from "@sapphire/pieces";

/// Resolves the bucket for an entity in an experiment.
///
/// Thin wrapper kept for the public module surface; it delegates to
/// `container.experiments.resolve`. Prefer calling the manager directly in new
/// code.
export function resolveExperiment(
	experimentKey: string,
	entityType: ResolveEntityType,
	entityId: string,
	options: ResolveOptions = {},
): Promise<ResolveResult> {
	return container.experiments.resolve(
		experimentKey,
		entityType,
		entityId,
		options,
	);
}
