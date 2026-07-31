import type { Mapping } from "#common/limits";
import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { getMappings } from "#common/limits";
import { isAuthenticated } from "#lib/api/decorators";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";
import { Middleware } from "@wolfstar/plugin-api";

declare module "@wolfstar/plugin-api" {
	interface ApiRequest {
		mappings: Mapping;
	}
}

export class AuthMiddleware extends Middleware {
	public constructor(context: Middleware.LoaderContext) {
		super(context, { name: "auth", position: 30 });
	}

	public run(request: ApiRequest, response: ApiResponse) {
		if (!request.route || !isAuthenticated(request.route)) return;

		if (isNullishOrEmpty(request.headers.authorization)) {
			response.json(
				{ success: false, message: "Missing authorization" },
				HttpCodes.Unauthorized,
			);
			return;
		}

		const mappings = getMappings(request.headers.authorization);
		if (!mappings) {
			response.json(
				{ success: false, message: "Missing access to this resource" },
				HttpCodes.Forbidden,
			);
			return;
		}

		request.mappings = mappings;
	}
}
