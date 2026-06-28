import { envParseInteger, envParseString } from "@wolfstar/env-utilities";
import { container } from "@wolfstar/http-framework";
import { Redis } from "ioredis";

export function run() {
	container.redis = new Redis({
		port: envParseInteger("REDIS_PORT"),
		password: envParseString("REDIS_PASSWORD"),
		host: envParseString("REDIS_HOST"),
		db: envParseInteger("REDIS_DB"),
	});

	// Swallow connection errors at the source: without a listener ioredis emits an
	// unhandled `error` event that would crash the process when Redis is offline.
	container.redis.on("error", (error) => {
		container.logger.error("[redis] client error", error);
	});
}

declare module "@sapphire/pieces" {
	interface Container {
		redis: Redis;
	}
}
