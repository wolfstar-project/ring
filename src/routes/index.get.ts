import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class HelloRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		super(context, { name: "root-hello-get" });
	}

	public run(_request: ApiRequest, response: ApiResponse) {
		response.json({ data: "Hello world" }, HttpCodes.OK);
	}
}
