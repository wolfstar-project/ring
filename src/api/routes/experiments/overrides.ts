import { getMappings } from "#common/limits";
import {
	normalizeOptional,
	readStringField,
	toBucketValue,
	toOverrideEntityType,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

container.server.route({
	url: "/experiments/:key/overrides",
	method: "POST",
	handler: async (request, reply) => {
		if (isNullishOrEmpty(request.headers.authorization)) {
			return reply
				.code(401)
				.send({ success: false, message: "Missing authorization" });
		}

		if (!getMappings(request.headers.authorization)) {
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
				.send({ success: false, message: "Missing experiment key" });
		}
		const key = (request.params as { key: string }).key;
		if (isNullishOrEmpty(key)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing experiment key" });
		}

		if (typeof request.body !== "object" || isNullish(request.body)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing request body" });
		}

		const body = request.body as Record<string, unknown>;
		const entityType = toOverrideEntityType(
			readStringField(body, "entity-type", "entityType"),
		);
		if (entityType === null) {
			return reply.code(400).send({
				success: false,
				message: "Entity type must be one of guild or user",
			});
		}

		const entityId = readStringField(body, "entity-id", "entityId");
		if (isNullishOrEmpty(entityId)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing entity ID" });
		}

		const rawBucket = body.bucket;
		const bucket =
			typeof rawBucket === "string" || typeof rawBucket === "number"
				? toBucketValue(rawBucket)
				: null;
		if (bucket === null) {
			return reply.code(400).send({
				success: false,
				message: "A valid bucket is required when setting an override.",
			});
		}

		// Reject overrides whose entity type does not match the experiment's
		// scope: the resolver's scope guard would never look them up, so they
		// would silently never apply. `BOTH` accepts either entity type.
		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			return reply
				.code(404)
				.send({ success: false, message: "That experiment does not exist." });
		}
		if (
			experiment.entityType !== "BOTH" &&
			experiment.entityType !== entityType
		) {
			return reply.code(400).send({
				success: false,
				message: `This experiment targets ${experiment.entityType.toLowerCase()} entities; a ${entityType.toLowerCase()} override would never apply.`,
			});
		}

		const createdBy =
			normalizeOptional(readStringField(body, "createdBy")) ?? "api";

		try {
			const override = await container.experiments.setOverride({
				experimentId: key,
				entityType,
				entityId,
				bucket,
				reason: normalizeOptional(readStringField(body, "reason")) ?? null,
				createdBy,
			});
			return reply.code(200).send(override);
		} catch (error) {
			container.logger.error(error);
			return reply.code(404).send({
				success: false,
				message: "That experiment does not exist.",
			});
		}
	},
});

container.server.route({
	url: "/experiments/:key/overrides/:entityType/:entityId",
	method: "DELETE",
	handler: async (request, reply) => {
		if (isNullishOrEmpty(request.headers.authorization)) {
			return reply
				.code(401)
				.send({ success: false, message: "Missing authorization" });
		}

		if (!getMappings(request.headers.authorization)) {
			return reply
				.code(403)
				.send({ success: false, message: "Missing access to this resource" });
		}

		if (
			typeof request.params !== "object" ||
			isNullish(request.params) ||
			!("key" in request.params) ||
			!("entityType" in request.params) ||
			!("entityId" in request.params)
		) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing parameters" });
		}

		const params = request.params as {
			key: string;
			entityType: string;
			entityId: string;
		};
		if (isNullishOrEmpty(params.key)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing experiment key" });
		}

		const entityType = toOverrideEntityType(params.entityType);
		if (entityType === null) {
			return reply.code(400).send({
				success: false,
				message: "Entity type must be one of guild or user",
			});
		}

		if (isNullishOrEmpty(params.entityId)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing entity ID" });
		}

		const count = await container.experiments.removeOverride(
			params.key,
			entityType,
			params.entityId,
		);
		const message =
			count === 0
				? "There was no override to remove."
				: `Removed the override for \`${params.entityId}\`.`;
		return reply.code(200).send({ success: true, count, message });
	},
});
