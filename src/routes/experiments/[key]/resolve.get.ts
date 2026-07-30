import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import { container } from "@sapphire/pieces";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class ExperimentResolveRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-resolve-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const key = request.params.key;

		const entityType = request.query.get("entityType");
		if (entityType !== "guild" && entityType !== "user") {
			response.json(
				{ success: false, message: "Invalid entity type" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const entityId = request.query.get("entityId");
		if (isNullishOrEmpty(entityId)) {
			response.json(
				{ success: false, message: "Missing entity ID" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const botId = request.query.get("botId");

		const result = await container.experiments.resolve(
			key,
			entityType,
			entityId,
			{
				botId,
			},
		);
		response.json(result, HttpCodes.OK);
	}
}
