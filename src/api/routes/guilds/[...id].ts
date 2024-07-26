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
	acrysel: {
		properties: { maximumYouTubeSubscriptions: true, maximumTwitchSubscriptions: true },
		defaults: { maximumYouTubeSubscriptions: 3, maximumTwitchSubscriptions: 5 }
	},
	skyra: {
		properties: { maximumFilteredWords: true, maximumFilteredReactions: true, maximumAllowedLinks: true, maximumAllowedInviteCodes: true },
		defaults: { maximumFilteredWords: 50, maximumFilteredReactions: 50, maximumAllowedLinks: 25, maximumAllowedInviteCodes: 25 }
	},
	teryl: {
		properties: { maximumTagCount: true },
		defaults: { maximumTagCount: 50 }
	}
} as const;

function getMappings(token: string) {
	switch (token) {
		case process.env.INTERNAL_API_ACRYSEL_TOKEN:
			return Mappings.acrysel;
		case process.env.INTERNAL_API_SKYRA_TOKEN:
			return Mappings.skyra;
		case process.env.INTERNAL_API_TERYL_TOKEN:
			return Mappings.teryl;
		default:
			return null;
	}
}
