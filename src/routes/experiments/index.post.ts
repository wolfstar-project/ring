import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
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

@Authenticated()
export class ExperimentsCreateRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-create-post" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
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

		const name = typeof body.name === "string" ? body.name.trim() : "";
		if (isNullishOrEmpty(name)) {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "A name is required" });
		}

		const category =
			typeof body.category === "string" ? body.category.trim() : "";
		if (isNullishOrEmpty(category)) {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "A category is required" });
		}

		const rawEntityType = readStringField(body, "entity-type", "entityType");
		if (
			rawEntityType !== "guild" &&
			rawEntityType !== "user" &&
			rawEntityType !== "both"
		) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: "Entity type must be one of guild, user, or both",
			});
		}

		const startDate = parseDate(
			readStringField(body, "start-date", "startDate"),
		);
		const endDate = parseDate(readStringField(body, "end-date", "endDate"));
		if (startDate === InvalidDate || endDate === InvalidDate) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: "One of the provided dates is invalid.",
			});
		}
		if (startDate && endDate && endDate < startDate) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message: "The end date cannot be before the start date.",
			});
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
			return response
				.status(HttpCodes.Created)
				.json(serializeExperiment(experiment));
		} catch (error) {
			container.logger.error(error);
			return response.status(HttpCodes.Conflict).json({
				success: false,
				message: `Could not create the experiment. A flag with the key \`${id}\` may already exist.`,
			});
		}
	}
}
