import { container } from "@sapphire/pieces";
import { envParseInteger } from "@wolfstar/env-utilities";

/// How often the expiry sweep runs, in milliseconds (default: 5 minutes).
const intervalMs = envParseInteger("EXPERIMENT_EXPIRY_INTERVAL_MS", 300_000);

/// Delay before the first sweep so expired flags are cleaned soon after boot
/// without competing with the rest of startup.
const initialDelayMs = 10_000;

/// Disables experiments whose scheduling window has closed, logging the
/// outcome. Never throws: a failure is logged so the timer keeps running.
async function runExpirySweep(): Promise<void> {
	try {
		const { disabledCount, ids } = await container.experiments.disableExpired();
		if (disabledCount > 0) {
			container.logger.info(
				`[experiments] disabled ${disabledCount} expired experiment(s): ${ids.join(", ")}`,
			);
		}
	} catch (error) {
		container.logger.error("[experiments] expiry sweep failed", error);
	}
}

setTimeout(() => {
	void runExpirySweep();
}, initialDelayMs).unref();

setInterval(() => {
	void runExpirySweep();
}, intervalMs).unref();
