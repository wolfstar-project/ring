import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import {
	normalizeOptional,
	readStringField,
	toBucketValue,
	toOverrideEntityType,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class ExperimentOverrideCreateRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-overrides-create-post" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const key = request.params.key;

		let body: Record<string, unknown>;
		try {
			body = (await request.readBodyJson()) as Record<string, unknown>;
		} catch {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "Missing request body" });
		}
		if (typeof body !== "object" || isNullish(body) || Array.isArray(body)) {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "Missing request body" });
		}

		const entityType = toOverrideEntityType(
			readStringField(body, "entity-type", "entityType"),
		);
		if (entityType === null) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: "Entity type must be one of guild or user",
			});
		}

		const entityId = readStringField(body, "entity-id", "entityId");
		if (isNullishOrEmpty(entityId)) {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "Missing entity ID" });
		}

		const rawBucket = body.bucket;
		const bucket =
			typeof rawBucket === "string" || typeof rawBucket === "number"
				? toBucketValue(rawBucket)
				: null;
		if (bucket === null) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: "A valid bucket is required when setting an override.",
			});
		}

		// Reject overrides whose entity type does not match the experiment's
		// scope: the resolver's scope guard would never look them up, so they
		// would silently never apply. `BOTH` accepts either entity type.
		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			return response
				.status(HttpCodes.NotFound)
				.json({ success: false, message: "That experiment does not exist." });
		}
		if (
			experiment.entityType !== "BOTH" &&
			experiment.entityType !== entityType
		) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: `This experiment targets ${experiment.entityType.toLowerCase()} entities; a ${entityType.toLowerCase()} override would never apply.`,
			});
		}

		const createdBy =
			normalizeOptional(readStringField(body, "createdBy")) ?? "api";

		try {
			const override = await container.experiments.setOverride({
				experimentId: key,
				entityType,
				entityId,
				bucket,
				reason: normalizeOptional(readStringField(body, "reason")) ?? null,
				createdBy,
			});
			return response.status(HttpCodes.OK).json(override);
		} catch (error) {
			container.logger.error(error);
			return response.status(HttpCodes.NotFound).json({
				success: false,
				message: "That experiment does not exist.",
			});
		}
	}
}
