import type { Prisma } from "#generated/prisma";
import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import {
	InvalidDate,
	normalizeOptional,
	parseEditableDate,
	readStringField,
	serializeExperiment,
	toRollout,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class ExperimentUpdateRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-update-patch" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

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
		if (isNullish(body)) {
			response.json(
				{ success: false, message: "Missing request body" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const endDate = parseEditableDate(
			readStringField(body, "end-date", "endDate"),
		);
		if (endDate === InvalidDate) {
			response.json(
				{ success: false, message: "The provided end date is invalid." },
				HttpCodes.BadRequest,
			);
			return;
		}

		// A concrete new end date must not fall before the stored start date,
		// which would invert the schedule window (expired before it starts).
		if (endDate instanceof Date) {
			const existing = await container.experiments.findById(key);
			if (isNullish(existing)) {
				response.json(
					{
						success: false,
						message: "That experiment does not exist.",
					},
					HttpCodes.NotFound,
				);
				return;
			}
			if (existing.startDate && endDate < existing.startDate) {
				response.json(
					{
						success: false,
						message:
							"The end date cannot be before the experiment's start date.",
					},
					HttpCodes.BadRequest,
				);
				return;
			}
		}

		const data: Prisma.ExperimentUpdateInput = {
			name: normalizeOptional(readStringField(body, "name")),
			description: normalizeOptional(readStringField(body, "description")),
			rollout:
				typeof body.rollout === "number" ? toRollout(body.rollout) : undefined,
			enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
			endDate,
		};

		try {
			const experiment = await container.experiments.update(key, data);
			response.json(serializeExperiment(experiment), HttpCodes.OK);
		} catch (error) {
			container.logger.error(error);
			response.json(
				{ success: false, message: "That experiment does not exist." },
				HttpCodes.NotFound,
			);
		}
	}
}
