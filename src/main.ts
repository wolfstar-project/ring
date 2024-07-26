import { setup } from '#lib/setup/all';
import { envParseInteger, envParseString } from '@skyra/env-utilities';
import { Client, container } from '@skyra/http-framework';
import { init, load } from '@skyra/http-framework-i18n';
import { registerCommands } from '@skyra/shared-http-pieces';
import { createBanner } from '@skyra/start-banner';
import gradient from 'gradient-string';

await setup();

await load(new URL('../src/locales', import.meta.url));
await init({ fallbackLng: 'en-US', returnNull: false, returnObjects: true, returnEmptyString: false });

const client = new Client();
await client.load();

await container.server.listen({
	host: envParseString('API_ADDRESS'),
	port: envParseInteger('API_PORT')
});

void registerCommands();

const address = envParseString('HTTP_ADDRESS', '0.0.0.0');
const port = envParseInteger('HTTP_PORT', 3000);
await client.listen({ address, port });

console.log(
	gradient.morning.multiline(
		createBanner({
			logo: [
				String.raw`            §`,
				String.raw`▄▄▄▄▄▄▄▄▄▄▄▄║▄▄▄▄▄▄▄▄▄▄▄▄`,
				String.raw`████████████║████████████`,
				String.raw`║▄      ╚╬╬╬║╬╬╬╝      ▄║`,
				String.raw`║█╗      ║║║║║║║      ╔█║`,
				String.raw`╚╬█╗     ╚╣║║║╠╝     ╔█╬╝`,
				String.raw` ║██╗▄▄▄▄▄║║║║║▄▄▄▄▄╔██║`,
				String.raw`╔╝██║     ║║║║║     ║██╚╗`,
				String.raw`║███║    ╔╝║║║╚╗    ║███║`,
				String.raw`║███║    ║██║██║    ║███║`,
				String.raw`║▀▀▀▀▀▀▀▀▀▀▀║▀▀▀▀▀▀▀▀▀▀▀║`
			],
			name: [
				String.raw`    _______   ________   _______   _______ `,
				String.raw`  ╱╱       ╲ ╱__   __ ╲╱╱   ╱   ╲╱╱       ╲ `,
				String.raw` ╱╱   ╱╱   ╱_╱       ╱╱╱   ╱    ╱╱      __╱ `,
				String.raw`╱      ╲__╱╱__   __  ╱   ╱     ╱       ╱ ╱ `,
				String.raw`╲____╱___╱ ╲╲_______╱╲__╱_____╱╲________╱ `,
				String.raw`                            ArchId Ring™️`
			],
			extra: [
				'',
				`Loaded: ${container.stores.get('commands').size} commands`,
				`      : ${container.stores.get('interaction-handlers').size} interaction handlers`,
				`Listening: ${address}:${port}`
			]
		})
	)
);

container.logger.info('Ready');
