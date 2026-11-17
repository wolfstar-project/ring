import type { ApiRequest, ApiResponse } from "@wolfstar/plugin-api";
import { HttpCodes } from "@wolfstar/http-framework";
import { Route } from "@wolfstar/plugin-api";

export class HelloRoute extends Route {
	public constructor(context: Route.LoaderContext) {
		// A named route takes its path and method from these options, not from its file name.
		super(context, { name: "root-hello-get", route: "/", methods: ["GET"] });
	}

	public run(_request: ApiRequest, response: ApiResponse) {
		return response.status(HttpCodes.OK).json({ data: "Hello world" });
	}
}
