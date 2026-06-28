import { ExperimentManager } from "#lib/experiments";
import { container } from "@sapphire/pieces";

const experiments = new ExperimentManager();
container.experiments = experiments;

declare module "@sapphire/pieces" {
	interface Container {
		experiments: ExperimentManager;
	}
}
