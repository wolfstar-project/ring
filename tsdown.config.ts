import { existsSync, mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import type { RolldownPluginOption } from "rolldown";
import alias from "@rollup/plugin-alias";

function resolveSource(base: string, subPath: string): string {
	if (subPath.endsWith(".ts")) return resolve(__dirname, base, subPath);
	return resolve(__dirname, base, `${subPath}.ts`);
}

// Plugin to copy .mjs files from src to dist
function copyPlugin(): RolldownPluginOption {
	return {
		name: "copy-mjs-files",
		buildEnd() {
			const srcDir = resolve(__dirname, "src/locales");
			const distLocalesDir = resolve(__dirname, "dist/locales");

			if (existsSync(srcDir)) {
				mkdirSync(distLocalesDir, { recursive: true });
				cpSync(srcDir, distLocalesDir, { recursive: true });
				console.log("✓ Copied locales to dist");
			}
		},
	};
}

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: "esm",
	plugins: [
		alias({
			entries: [
				{
					find: "#lib",
					replacement: "#lib",
					customResolver(source) {
						const subPath = source.replace("#lib/", "");
						return resolveSource("src/lib", subPath);
					},
				},
				{
					find: "#api",
					replacement: "#api",
					customResolver(source) {
						const subPath = source.replace("#api/", "");
						return resolveSource("src/api", subPath);
					},
				},
			],
		}),
		copyPlugin(),
	],
	dts: false,
	unbundle: true,
	sourcemap: true,
	minify: false,
	platform: "node",
	tsconfig: "src/tsconfig.json",
	treeshake: true,
	deps: { neverBundle: ["#generated/prisma"], skipNodeModulesBundle: true },
});
