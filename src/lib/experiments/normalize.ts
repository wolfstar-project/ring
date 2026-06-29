import type { ExperimentEntityType } from "./manager";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { ExperimentBucket } from "./types";

/// Sentinel returned by the date parsers when the input cannot be parsed into a
/// valid `Date`. Distinguishes "invalid" from "absent" (`undefined`).
export const InvalidDate = Symbol("invalid-date");

/// Parses an optional ISO 8601 string into a `Date`.
///
/// Returns `undefined` when absent/empty, the `InvalidDate` sentinel when
/// unparseable, or the parsed `Date`.
export function parseDate(
	input?: string | null,
): Date | typeof InvalidDate | undefined {
	if (isNullishOrEmpty(input)) return undefined;
	const date = new Date(input);
	return Number.isNaN(date.getTime()) ? InvalidDate : date;
}

/// Like `parseDate`, but also accepts the sentinels `none`/`clear`, returning
/// `null` so an edit can remove a previously set date. Absent input still
/// returns `undefined`, which Prisma leaves unchanged.
export function parseEditableDate(
	input?: string | null,
): Date | null | typeof InvalidDate | undefined {
	const normalized = input?.trim().toLowerCase();
	if (normalized === "none" || normalized === "clear") return null;
	return parseDate(input);
}

/// Collapses empty/whitespace strings to `undefined`, otherwise returns the
/// original value.
export function normalizeOptional(value?: string | null): string | undefined {
	return isNullishOrEmpty(value) ? undefined : value;
}

/// Returns the first `string` value found among the given keys of an
/// object-shaped request body. Lets routes accept both kebab-case
/// (`entity-type`) and camelCase (`entityType`) aliases.
export function readStringField(
	source: Record<string, unknown>,
	...keys: string[]
): string | undefined {
	for (const key of keys) {
		const value = source[key];
		if (typeof value === "string") return value;
	}
	return undefined;
}

/// Maps the public `guild`/`user`/`both` entity-type values to the Prisma enum,
/// defaulting unknown input to `GUILD` (matching the slash command).
export function toEntityType(value: string): "GUILD" | "USER" | "BOTH" {
	if (value === "user") return "USER";
	if (value === "both") return "BOTH";
	return "GUILD";
}

/// Maps the public `guild`/`user` override entity-type values to the Prisma
/// enum, or `null` when the value is neither.
export function toOverrideEntityType(
	value: unknown,
): ExperimentEntityType | null {
	if (value === "guild") return "GUILD";
	if (value === "user") return "USER";
	return null;
}

/// Converts a 0-100 percentage into the stored 0-10000 rollout scale, clamping
/// out-of-range input.
export function toRollout(percent?: number | null): number {
	if (isNullish(percent)) return 0;
	return Math.max(0, Math.min(100, percent)) * 100;
}

/// Converts the stored 0-10000 rollout scale back to a 0-100 percentage for
/// API responses.
export function fromRollout(stored?: number | null): number {
	if (isNullish(stored)) return 0;
	return stored / 100;
}

/// Serializes an experiment for API responses, exposing rollout as a 0-100
/// percentage instead of the internal 0-10000 scale.
export function serializeExperiment<T extends { rollout: number }>(
	experiment: T,
): T {
	return { ...experiment, rollout: fromRollout(experiment.rollout) };
}

/// Resolves a bucket from either the string aliases used by the slash command
/// (`eligible`/`not-eligible`/`override`) or their raw numeric values
/// (`0`/`1`/`2`). Returns `null` for unrecognised input.
export function toBucketValue(
	value?: string | number | null,
): ExperimentBucket | null {
	switch (value) {
		case "eligible":
		case 0:
			return ExperimentBucket.Eligible;
		case "not-eligible":
		case 1:
			return ExperimentBucket.NotEligible;
		case "override":
		case 2:
			return ExperimentBucket.Override;
		default:
			return null;
	}
}
