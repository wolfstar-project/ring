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
			body = await request.readBodyJson<Record<string, unknown>>();
		} catch {
			response.json(
				{ success: false, message: "Missing request body" },
				HttpCodes.BadRequest,
			);
			return;
		}
		if (typeof body !== "object" || isNullish(body) || Array.isArray(body)) {
			response.json(
				{ success: false, message: "Missing request body" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const entityType = toOverrideEntityType(
			readStringField(body, "entity-type", "entityType"),
		);
		if (entityType === null) {
			response.json(
				{
					success: false,
					message: "Entity type must be one of guild or user",
				},
				HttpCodes.BadRequest,
			);
			return;
		}

		const entityId = readStringField(body, "entity-id", "entityId");
		if (isNullishOrEmpty(entityId)) {
			response.json(
				{ success: false, message: "Missing entity ID" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const rawBucket = body.bucket;
		const bucket =
			typeof rawBucket === "string" || typeof rawBucket === "number"
				? toBucketValue(rawBucket)
				: null;
		if (bucket === null) {
			response.json(
				{
					success: false,
					message: "A valid bucket is required when setting an override.",
				},
				HttpCodes.BadRequest,
			);
			return;
		}

		// Reject overrides whose entity type does not match the experiment's
		// scope: the resolver's scope guard would never look them up, so they
		// would silently never apply. `BOTH` accepts either entity type.
		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			response.json(
				{ success: false, message: "That experiment does not exist." },
				HttpCodes.NotFound,
			);
			return;
		}
		if (
			experiment.entityType !== "BOTH" &&
			experiment.entityType !== entityType
		) {
			response.json(
				{
					success: false,
					message: `This experiment targets ${experiment.entityType.toLowerCase()} entities; a ${entityType.toLowerCase()} override would never apply.`,
				},
				HttpCodes.BadRequest,
			);
			return;
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
			response.json(override, HttpCodes.OK);
		} catch (error) {
			container.logger.error(error);
			response.json(
				{
					success: false,
					message: "That experiment does not exist.",
				},
				HttpCodes.NotFound,
			);
		}
	}
}
