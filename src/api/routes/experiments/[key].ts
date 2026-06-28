import type { Prisma } from "#generated/prisma";
import { getMappings } from "#common/limits";
import {
	InvalidDate,
	normalizeOptional,
	parseEditableDate,
	readStringField,
	toRollout,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

function getKey(request: { params: unknown }): string | null {
	if (
		typeof request.params !== "object" ||
		isNullish(request.params) ||
		!("key" in request.params)
	) {
		return null;
	}
	const key = (request.params as { key: unknown }).key;
	return typeof key === "string" && !isNullishOrEmpty(key) ? key : null;
}

container.server.route({
	url: "/experiments/:key",
	method: "GET",
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

		const key = getKey(request);
		if (key === null) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing experiment key" });
		}

		const experiment = await container.experiments.findById(key);
		if (isNullish(experiment)) {
			return reply
				.code(404)
				.send({ success: false, message: "That experiment does not exist." });
		}

		const overrideCount = await container.experiments.countOverrides(key);
		return reply.code(200).send({ ...experiment, overrideCount });
	},
});

container.server.route({
	url: "/experiments/:key",
	method: "PATCH",
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

		const key = getKey(request);
		if (key === null) {
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

		const endDate = parseEditableDate(
			readStringField(body, "end-date", "endDate"),
		);
		if (endDate === InvalidDate) {
			return reply
				.code(400)
				.send({ success: false, message: "The provided end date is invalid." });
		}

		// A concrete new end date must not fall before the stored start date,
		// which would invert the schedule window (expired before it starts).
		if (endDate instanceof Date) {
			const existing = await container.experiments.findById(key);
			if (isNullish(existing)) {
				return reply.code(404).send({
					success: false,
					message: "That experiment does not exist.",
				});
			}
			if (existing.startDate && endDate < existing.startDate) {
				return reply.code(400).send({
					success: false,
					message: "The end date cannot be before the experiment's start date.",
				});
			}
		}

		const data: Prisma.ExperimentUpdateInput = {
			name: normalizeOptional(readStringField(body, "name")),
			description: normalizeOptional(readStringField(body, "description")),
			rollout:
				typeof body.rollout === "number" ? toRollout(body.rollout) : undefined,
			enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
			endDate,
		};

		try {
			const experiment = await container.experiments.update(key, data);
			return reply.code(200).send(experiment);
		} catch (error) {
			container.logger.error(error);
			return reply
				.code(404)
				.send({ success: false, message: "That experiment does not exist." });
		}
	},
});

container.server.route({
	url: "/experiments/:key",
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

		const key = getKey(request);
		if (key === null) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing experiment key" });
		}

		const query =
			typeof request.query === "object" && !isNullish(request.query)
				? (request.query as Record<string, unknown>)
				: {};
		if (query.confirm !== key) {
			return reply.code(400).send({
				success: false,
				message:
					"The confirmation does not match the experiment key. Deletion aborted.",
			});
		}

		try {
			await container.experiments.delete(key);
			return reply
				.code(200)
				.send({ success: true, message: `Deleted experiment \`${key}\`.` });
		} catch (error) {
			container.logger.error(error);
			return reply
				.code(404)
				.send({ success: false, message: "That experiment does not exist." });
		}
	},
});
