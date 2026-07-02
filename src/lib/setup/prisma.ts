import { PrismaClient } from "#generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { container } from "@wolfstar/http-framework";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({
	connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
container.prisma = prisma;

export type { Experiment, ExperimentOverride, Guild } from "#generated/prisma";

declare module "@sapphire/pieces" {
	interface Container {
		prisma: PrismaClient;
	}
}
