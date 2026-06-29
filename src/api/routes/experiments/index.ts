import type { Prisma } from "#generated/prisma";
import { getMappings } from "#common/limits";
import {
	InvalidDate,
	buildExperimentKey,
	normalizeOptional,
	parseDate,
	readStringField,
	serializeExperiment,
	toEntityType,
	toRollout,
} from "#lib/experiments";
import { container } from "@sapphire/pieces";
import { isNullish, isNullishOrEmpty } from "@sapphire/utilities";

const ExperimentsPerPage = 10;

container.server.route({
	url: "/experiments",
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

		const query =
			typeof request.query === "object" && !isNullish(request.query)
				? (request.query as Record<string, unknown>)
				: {};

		const category = typeof query.category === "string" ? query.category : null;
		const botId = typeof query["bot-id"] === "string" ? query["bot-id"] : null;
		const status = typeof query.status === "string" ? query.status : "all";

		const now = new Date();
		const where: Prisma.ExperimentWhereInput = {};
		if (!isNullishOrEmpty(category)) where.category = category;
		if (!isNullishOrEmpty(botId)) where.botId = botId;

		switch (status) {
			case "disabled":
				where.enabled = false;
				break;
			case "expired":
				where.endDate = { lt: now };
				break;
			case "active":
				where.enabled = true;
				where.AND = [
					{ OR: [{ startDate: null }, { startDate: { lte: now } }] },
					{ OR: [{ endDate: null }, { endDate: { gte: now } }] },
				];
				break;
			default:
				break;
		}

		const parsedPage = Number(query.page);
		const page = Number.isFinite(parsedPage)
			? Math.max(1, Math.trunc(parsedPage))
			: 1;

		const [total, experiments] = await Promise.all([
			container.experiments.count(where),
			container.experiments.list({
				where,
				skip: (page - 1) * ExperimentsPerPage,
				take: ExperimentsPerPage,
			}),
		]);

		const totalPages = Math.max(1, Math.ceil(total / ExperimentsPerPage));
		return reply.code(200).send({
			page,
			totalPages,
			total,
			experiments: experiments.map(serializeExperiment),
		});
	},
});

container.server.route({
	url: "/experiments",
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

		if (typeof request.body !== "object" || isNullish(request.body)) {
			return reply
				.code(400)
				.send({ success: false, message: "Missing request body" });
		}

		const body = request.body as Record<string, unknown>;
		const name = typeof body.name === "string" ? body.name.trim() : "";
		if (isNullishOrEmpty(name)) {
			return reply
				.code(400)
				.send({ success: false, message: "A name is required" });
		}

		const category =
			typeof body.category === "string" ? body.category.trim() : "";
		if (isNullishOrEmpty(category)) {
			return reply
				.code(400)
				.send({ success: false, message: "A category is required" });
		}

		const rawEntityType = readStringField(body, "entity-type", "entityType");
		if (
			rawEntityType !== "guild" &&
			rawEntityType !== "user" &&
			rawEntityType !== "both"
		) {
			return reply.code(400).send({
				success: false,
				message: "Entity type must be one of guild, user, or both",
			});
		}

		const startDate = parseDate(
			readStringField(body, "start-date", "startDate"),
		);
		const endDate = parseDate(readStringField(body, "end-date", "endDate"));
		if (startDate === InvalidDate || endDate === InvalidDate) {
			return reply.code(400).send({
				success: false,
				message: "One of the provided dates is invalid.",
			});
		}
		if (startDate && endDate && endDate < startDate) {
			return reply.code(400).send({
				success: false,
				message: "The end date cannot be before the start date.",
			});
		}

		const rollout =
			typeof body.rollout === "number" ? toRollout(body.rollout) : 0;

		const botId =
			normalizeOptional(readStringField(body, "bot-id", "botId")) ?? null;

		const createdBy =
			normalizeOptional(readStringField(body, "createdBy")) ?? "api";

		const id = buildExperimentKey({
			category,
			name,
			botId,
		});

		try {
			const experiment = await container.experiments.create({
				id,
				name,
				description:
					normalizeOptional(readStringField(body, "description")) ?? null,
				category,
				entityType: toEntityType(rawEntityType),
				rollout,
				startDate: startDate ?? null,
				endDate: endDate ?? null,
				createdBy,
				botId,
			});
			return reply.code(201).send(serializeExperiment(experiment));
		} catch (error) {
			container.logger.error(error);
			return reply.code(409).send({
				success: false,
				message: `Could not create the experiment. A flag with the key \`${id}\` may already exist.`,
			});
		}
	},
});
