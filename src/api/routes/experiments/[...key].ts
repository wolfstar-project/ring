import { getMappings } from "#common/limits";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

container.server.route({
	url: "/experiments/:key/resolve",
	method: "GET",
	handler: async (request, reply) => {
		if (isNullishOrEmpty(request.headers.authorization)) {
			return reply
				.code(401)
				.send({ success: false, message: "Missing authorization" });
		}

		const mappings = getMappings(request.headers.authorization);
		if (!mappings) {
			return reply
				.code(403)
				.send({ success: false, message: "Missing access to this resource" });
		}

		if (
			typeof request.params !== "object" ||
			isNullish(request.params) ||
			!("key" in request.params)
		) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing parameters" });
		}

		const key = request.params.key as string;
		if (isNullishOrEmpty(key)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing experiment key" });
		}

		if (typeof request.query !== "object" || isNullish(request.query)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing parameters" });
		}

		const query = request.query as Record<string, unknown>;
		const entityType = query.entityType;
		if (entityType !== "guild" && entityType !== "user") {
			return reply
				.code(400)
				.send({ success: false, message: "Invalid entity type" });
		}

		const entityId = query.entityId;
		if (typeof entityId !== "string" || isNullishOrEmpty(entityId)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing entity ID" });
		}

		const botId = typeof query.botId === "string" ? query.botId : null;

		const result = await container.experiments.resolve(
			key,
			entityType,
			entityId,
			{
				botId,
			},
		);
		return reply.code(200).send(result);
	},
});
