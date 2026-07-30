import type { Mapping } from "#common/limits";
import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { getMappings } from "#common/limits";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { HttpCodes } from "@wolfstar/http-framework";

export function requireMapping(
	request: ApiRequest,
	response: ApiResponse,
): Mapping | null {
	if (isNullishOrEmpty(request.headers.authorization)) {
		response.json(
			{ success: false, message: "Missing authorization" },
			HttpCodes.Unauthorized,
		);
		return null;
	}

	const mappings = getMappings(request.headers.authorization);
	if (!mappings) {
		response.json(
			{ success: false, message: "Missing access to this resource" },
			HttpCodes.Forbidden,
		);
		return null;
	}

	return mappings;
}
