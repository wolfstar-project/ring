import type { ResolveEntityType, ResolveResult } from "./types";
import { container } from "@sapphire/pieces";

/// Time-to-live for a cached resolution, in seconds.
///
/// Kept short so cached `disabled`/`expired`/`hash` results self-heal quickly
/// even if a cache-bust is ever missed; mutations also invalidate explicitly.
export const ResolveCacheTtlSeconds = 60;

/// Prefix shared by every resolution cache key, used as the `SCAN` anchor.
const ResolveCachePrefix = "exp:resolve";

/// Builds the cache key for a single resolution.
///
/// Format: `exp:resolve:{botId ?? "global"}:{experimentKey}:{entityType}:{entityId}`.
function buildResolveCacheKey(
	experimentKey: string,
	entityType: ResolveEntityType,
	entityId: string,
	botId: string | null,
): string {
	return `${ResolveCachePrefix}:${botId ?? "global"}:${experimentKey}:${entityType}:${entityId}`;
}

/// Reads a previously cached resolution, or `null` on a miss.
///
/// Any failure (Redis offline, malformed JSON) is logged and treated as a miss
/// so resolution always falls back to the database.
export async function getCachedResolve(
	experimentKey: string,
	entityType: ResolveEntityType,
	entityId: string,
	botId: string | null,
): Promise<ResolveResult | null> {
	try {
		const key = buildResolveCacheKey(
			experimentKey,
			entityType,
			entityId,
			botId,
		);
		const cached = await container.redis.get(key);
		if (cached === null) return null;
		return JSON.parse(cached) as ResolveResult;
	} catch (error) {
		container.logger.error("[experiments] getCachedResolve failed", error);
		return null;
	}
}

/// Stores a resolution with an expiry. Best-effort: never throws.
export async function setCachedResolve(
	experimentKey: string,
	entityType: ResolveEntityType,
	entityId: string,
	botId: string | null,
	result: ResolveResult,
	ttl: number = ResolveCacheTtlSeconds,
): Promise<void> {
	try {
		const key = buildResolveCacheKey(
			experimentKey,
			entityType,
			entityId,
			botId,
		);
		await container.redis.set(key, JSON.stringify(result), "EX", ttl);
	} catch (error) {
		container.logger.error("[experiments] setCachedResolve failed", error);
	}
}

/// Deletes every cached resolution for an experiment across all bot scopes,
/// entity types, and entities.
///
/// Uses a non-blocking `SCAN` cursor loop (never the blocking `KEYS` command)
/// so a large keyspace cannot stall Redis. Best-effort: never throws.
export async function invalidateExperimentCache(
	experimentKey: string,
): Promise<void> {
	try {
		const match = `${ResolveCachePrefix}:*:${experimentKey}:*`;
		let cursor = "0";
		do {
			// Each SCAN depends on the previous cursor, so the loop is inherently
			// sequential; deletions are batched per page to keep memory bounded.
			// oxlint-disable no-await-in-loop
			const [nextCursor, keys] = await container.redis.scan(
				cursor,
				"MATCH",
				match,
				"COUNT",
				100,
			);
			cursor = nextCursor;
			if (keys.length > 0) await container.redis.del(...keys);
			// oxlint-enable no-await-in-loop
		} while (cursor !== "0");
	} catch (error) {
		container.logger.error(
			"[experiments] invalidateExperimentCache failed",
			error,
		);
	}
}
