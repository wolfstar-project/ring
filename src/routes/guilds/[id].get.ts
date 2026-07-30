import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { requireMapping } from "#lib/api/auth";
import { container } from "@sapphire/pieces";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class GuildRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "guilds-detail-get" });
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const mappings = requireMapping(request, response);
		if (mappings === null) return;

		let id: bigint;
		try {
			id = BigInt(request.params.id);
		} catch {
			response.json(
				{ success: false, message: "Invalid Guild ID" },
				HttpCodes.BadRequest,
			);
			return;
		}

		const data = await container.prisma.guild.findFirst({
			where: { id },
			select: mappings.properties,
		});
		response.json(data ?? mappings.defaults, HttpCodes.OK);
	}
}
