import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import {
	InvalidDate,
	buildExperimentKey,
	normalizeOptional,
	parseDate,
	readStringField,
	serializeExperiment,
	toEntityType,
	toRollout,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class ExperimentsCreateRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-create-post" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

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

		const name = typeof body.name === "string" ? body.name.trim() : "";
		if (isNullishOrEmpty(name)) {
			response.json(
				{ success: false, message: "A name is required" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const category =
			typeof body.category === "string" ? body.category.trim() : "";
		if (isNullishOrEmpty(category)) {
			response.json(
				{ success: false, message: "A category is required" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const rawEntityType = readStringField(body, "entity-type", "entityType");
		if (
			rawEntityType !== "guild" &&
			rawEntityType !== "user" &&
			rawEntityType !== "both"
		) {
			response.json(
				{
					success: false,
					message: "Entity type must be one of guild, user, or both",
				},
				HttpCodes.BadRequest,
			);
			return;
		}

		const startDate = parseDate(
			readStringField(body, "start-date", "startDate"),
		);
		const endDate = parseDate(readStringField(body, "end-date", "endDate"));
		if (startDate === InvalidDate || endDate === InvalidDate) {
			response.json(
				{
					success: false,
					message: "One of the provided dates is invalid.",
				},
				HttpCodes.BadRequest,
			);
			return;
		}
		if (startDate && endDate && endDate < startDate) {
			response.json(
				{
					success: false,
					message: "The end date cannot be before the start date.",
				},
				HttpCodes.BadRequest,
			);
			return;
		}

		const rollout =
			typeof body.rollout === "number" ? toRollout(body.rollout) : 0;

		const botId =
			normalizeOptional(readStringField(body, "bot-id", "botId")) ?? null;

		const createdBy =
			normalizeOptional(readStringField(body, "createdBy")) ?? "api";

		const id = buildExperimentKey({
			category,
			name,
			botId,
		});

		try {
			const experiment = await container.experiments.create({
				id,
				name,
				description:
					normalizeOptional(readStringField(body, "description")) ?? null,
				category,
				entityType: toEntityType(rawEntityType),
				rollout,
				startDate: startDate ?? null,
				endDate: endDate ?? null,
				createdBy,
				botId,
			});
			response.json(serializeExperiment(experiment), HttpCodes.Created);
		} catch (error) {
			container.logger.error(error);
			response.json(
				{
					success: false,
					message: `Could not create the experiment. A flag with the key \`${id}\` may already exist.`,
				},
				HttpCodes.Conflict,
			);
		}
	}
}
