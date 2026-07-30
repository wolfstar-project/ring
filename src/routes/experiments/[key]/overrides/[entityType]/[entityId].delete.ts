import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import { toOverrideEntityType } from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class ExperimentOverrideDeleteRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-overrides-delete" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const { key, entityId } = request.params;

		const entityType = toOverrideEntityType(request.params.entityType);
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

		const count = await container.experiments.removeOverride(
			key,
			entityType,
			entityId,
		);
		const message =
			count === 0
				? "There was no override to remove."
				: `Removed the override for \`${entityId}\`.`;
		response.json({ success: true, count, message }, HttpCodes.OK);
	}
}
