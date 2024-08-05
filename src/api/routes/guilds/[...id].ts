import { container } from '@sapphire/pieces';
import { isNullish, isNullishOrEmpty } from '@sapphire/utilities';

container.server.route({
	url: '/guilds/:id',
	method: 'GET',
	handler: async (request, reply) => {
		if (isNullishOrEmpty(request.headers.authorization)) {
			return reply.code(401).send({ success: false, message: 'Missing authorization' });
		}

		const mappings = getMappings(request.headers.authorization);
		if (!mappings) {
			return reply.code(403).send({ success: false, message: 'Missing access to this resource' });
		}

		if (typeof request.params !== 'object' || isNullish(request.params) || !('id' in request.params)) {
			return reply.code(400).send({ success: false, message: 'Missing parameters' });
		}

		let id: bigint;
		try {
			id = BigInt(request.params.id as string);
		} catch {
			return reply.code(400).send({ success: false, message: 'Invalid Guild ID' });
		}

		const data = await container.prisma.guild.findFirst({ where: { id }, select: mappings.properties });
		return reply.code(200).send(data ?? mappings.defaults);
	}
});

const Mappings = {
	staryl: {
		properties: { maximumYouTubeSubscriptions: true, maximumTwitchSubscriptions: true },
		defaults: { maximumYouTubeSubscriptions: 3, maximumTwitchSubscriptions: 5 }
	},
	wolfstar: {
		properties: { maximumFilteredWords: true, maximumFilteredReactions: true, maximumAllowedLinks: true, maximumAllowedInviteCodes: true },
		defaults: { maximumFilteredWords: 50, maximumFilteredReactions: 50, maximumAllowedLinks: 25, maximumAllowedInviteCodes: 25 }
	}
} as const;

function getMappings(token: string) {
	switch (token) {
		case process.env.INTERNAL_API_STARYL_TOKEN:
			return Mappings.staryl;
		case process.env.INTERNAL_API_WOLFSTAR_TOKEN:
			return Mappings.wolfstar;
		default:
			return null;
	}
}
