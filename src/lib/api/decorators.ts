import type { Route } from "@wolfstar/plugin-api";

const authenticatedRoutes = new WeakSet<Function>();

export function Authenticated(): ClassDecorator {
	return (target) => {
		authenticatedRoutes.add(target);
	};
}

export function isAuthenticated(route: Pick<Route, "constructor">): boolean {
	return authenticatedRoutes.has(route.constructor);
}
