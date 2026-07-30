import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import { serializeExperiment } from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class ExperimentRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-detail-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

		const key = request.params.key;

		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			response.json(
				{ success: false, message: "That experiment does not exist." },
				HttpCodes.NotFound,
			);
			return;
		}

		const overrideCount = await container.experiments.countOverrides(key);
		response.json(
			{ ...serializeExperiment(experiment), overrideCount },
			HttpCodes.OK,
		);
	}
}
