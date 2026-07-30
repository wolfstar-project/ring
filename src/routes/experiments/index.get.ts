import type { Prisma } from "#generated/prisma";
import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import { serializeExperiment } from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

const ExperimentsPerPage = 10;

export class ExperimentsListRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "experiments-list-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

		const category = request.query.get("category");
		const botId = request.query.get("bot-id");
		const status = request.query.get("status") ?? "all";

		const now = new Date();
		const where: Prisma.ExperimentWhereInput = {};
		if (!isNullishOrEmpty(category)) where.category = category;
		if (!isNullishOrEmpty(botId)) where.botId = botId;

		switch (status) {
			case "disabled":
				where.enabled = false;
				break;
			case "expired":
				where.endDate = { lt: now };
				break;
			case "active":
				where.enabled = true;
				where.AND = [
					{ OR: [{ startDate: null }, { startDate: { lte: now } }] },
					{ OR: [{ endDate: null }, { endDate: { gte: now } }] },
				];
				break;
			default:
				break;
		}

		const parsedPage = Number(request.query.get("page"));
		const page = Number.isFinite(parsedPage)
			? Math.max(1, Math.trunc(parsedPage))
			: 1;

		const [total, experiments] = await Promise.all([
			container.experiments.count(where),
			container.experiments.list({
				where,
				skip: (page - 1) * ExperimentsPerPage,
				take: ExperimentsPerPage,
			}),
		]);

		const totalPages = Math.max(1, Math.ceil(total / ExperimentsPerPage));
		response.json(
			{
				page,
				totalPages,
				total,
				experiments: experiments.map(serializeExperiment),
			},
			HttpCodes.OK,
		);
	}
}
