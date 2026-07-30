import { run as redisRun } from "#lib/setup/redis";
import { envParseString, setup as envRun } from "@wolfstar/env-utilities";
import {
	initializeSentry,
	setInvite,
	setRepository,
} from "@wolfstar/shared-http-pieces";
/* oxlint-disable import/first */
import "#lib/setup/logger";
import "#lib/setup/prisma";
import "#lib/setup/experiments";
import "#lib/setup/experimentsExpiry";
import "@wolfstar/plugin-api/register";
import "@wolfstar/shared-http-pieces/register";

export async function setup() {
	envRun(new URL("../../../src/.env", import.meta.url));

	setRepository("ring");
	setInvite(envParseString("DISCORD_CLIENT_ID"), "0");
	initializeSentry();

	redisRun();
}
