import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import { container } from "@sapphire/pieces";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class ExperimentDeleteRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-delete" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const key = request.params.key;

		if (request.query.get("confirm") !== key) {
			return response.status(HttpCodes.BadRequest).json({
				success: false,
				message:
					"The confirmation does not match the experiment key. Deletion aborted.",
			});
		}

		try {
			await container.experiments.delete(key);
			return response
				.status(HttpCodes.OK)
				.json({ success: true, message: `Deleted experiment \`${key}\`.` });
		} catch (error) {
			container.logger.error(error);
			return response
				.status(HttpCodes.NotFound)
				.json({ success: false, message: "That experiment does not exist." });
		}
	}
}
