import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import { container } from "@sapphire/pieces";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class ExperimentDeleteRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-delete" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

		const key = request.params.key;

		if (request.query.get("confirm") !== key) {
			response.json(
				{
					success: false,
					message:
						"The confirmation does not match the experiment key. Deletion aborted.",
				},
				HttpCodes.BadRequest,
			);
			return;
		}

		try {
			await container.experiments.delete(key);
			response.json(
				{ success: true, message: `Deleted experiment \`${key}\`.` },
				HttpCodes.OK,
			);
		} catch (error) {
			container.logger.error(error);
			response.json(
				{ success: false, message: "That experiment does not exist." },
				HttpCodes.NotFound,
			);
		}
	}
}
