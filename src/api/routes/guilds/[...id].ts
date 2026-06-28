import { getMappings } from "#common/limits";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

container.server.route({
	url: "/guilds/:id",
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
			!("id" in request.params)
		) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing parameters" });
		}

		let id: bigint;
		try {
			id = BigInt(request.params.id as string);
		} catch {
			return reply
				.code(400)
				.send({ success: false, message: "Invalid Guild ID" });
		}

		const data = await container.guilds.findById(id, {
			select: mappings.properties,
		});
		return reply.code(200).send(data ?? mappings.defaults);
	},
});
