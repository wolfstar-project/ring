import { defineConfig } from 'tsdown';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, cpSync } from 'node:fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import type { RolldownPluginOption } from 'rolldown';
import alias from '@rollup/plugin-alias';

// Plugin to copy .mjs files from src to dist
function copyPlugin(): RolldownPluginOption {
	return {
		name: 'copy-mjs-files',
		buildEnd() {
			const srcDir = resolve(__dirname, 'src/locales');
			const destLocalesDir = resolve(__dirname, 'dist/locales');

			if (existsSync(srcDir)) {
				mkdirSync(destLocalesDir, { recursive: true });
				cpSync(srcDir, destLocalesDir, { recursive: true });
				console.log('✓ Copied locales to dist');
			}
		}
	};
}

export default defineConfig({
	entry: ['src/**/*.ts'],
	format: 'esm',
	plugins: [
		alias({
			entries: [
				{ find: /^#api\/(.*)/, replacement: resolve('src/api/$1.ts') },
				{ find: /^#lib\/(.*)/, replacement: resolve('src/lib/$1.ts') }
			]
		}),
		copyPlugin()
	],
	dts: true,
	unbundle: true,
	sourcemap: true,
	minify: false,
	platform: 'node',
	tsconfig: 'src/tsconfig.json',
	treeshake: true,
	skipNodeModulesBundle: true
});
