/// The resolved bucket for an entity in an experiment.
///
/// Stored as an integer in Prisma and shared across the resolver, commands, and
/// the internal API, so this is a standard `enum` (not `const enum`).
export enum ExperimentBucket {
	/// Hash-assigned in or overridden in: the feature is active.
	Eligible = 0,
	/// Hash-assigned out, disabled, or expired: the feature is inactive.
	NotEligible = 1,
	/// Admin-forced: the feature is always on and bypasses the rollout.
	Override = 2,
}

/// Why a given bucket was assigned. Mirrors the resolution priority chain.
export type ResolutionSource = "disabled" | "expired" | "override" | "hash";

/// The kind of entity being resolved.
export type ResolveEntityType = "guild" | "user";

export interface ResolveOptions {
	/// Bot scope to resolve against. `null`/omitted resolves global flags only.
	botId?: string | null;
}

export interface ResolveResult {
	bucket: ExperimentBucket;
	source: ResolutionSource;
}
