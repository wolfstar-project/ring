import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { Authenticated } from "#lib/api/decorators";
import { container } from "@sapphire/pieces";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

@Authenticated()
export class GuildRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		// A named route takes its path and method from these options, not from its file name.
		super(context, {
			name: "guilds-detail-get",
			route: "/guilds/[id]",
			methods: ["GET"],
		});
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		let id: bigint;
		try {
			id = BigInt(request.params.id);
		} catch {
			return response
				.status(HttpCodes.BadRequest)
				.json({ success: false, message: "Invalid Guild ID" });
		}

		const data = await container.prisma.guild.findFirst({
			where: { id },
			select: request.mappings.properties,
		});
		return response
			.status(HttpCodes.OK)
			.json(data ?? request.mappings.defaults);
	}
}
