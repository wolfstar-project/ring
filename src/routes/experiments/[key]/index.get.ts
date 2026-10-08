import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import { serializeExperiment } from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class ExperimentRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-detail-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const key = request.params.key;

		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			return response
				.status(HttpCodes.NotFound)
				.json({ success: false, message: "That experiment does not exist." });
		}

		const overrideCount = await container.experiments.countOverrides(key);
		return response
			.status(HttpCodes.OK)
			.json({ ...serializeExperiment(experiment), overrideCount });
	}
}
