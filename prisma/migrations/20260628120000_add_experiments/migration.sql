-- CreateEnum
CREATE TYPE "experiment_entity_type" AS ENUM ('GUILD', 'USER', 'BOTH');

-- CreateTable
CREATE TABLE "experiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "entity_type" "experiment_entity_type" NOT NULL DEFAULT 'GUILD',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout" SMALLINT NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "bot_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_override" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "entity_type" "experiment_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "bucket" SMALLINT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_override_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "experiment_category_idx" ON "experiment"("category");

-- CreateIndex
CREATE INDEX "experiment_enabled_idx" ON "experiment"("enabled");

-- CreateIndex
CREATE INDEX "experiment_bot_id_idx" ON "experiment"("bot_id");

-- CreateIndex
CREATE INDEX "experiment_override_entity_id_idx" ON "experiment_override"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_override_experiment_id_entity_type_entity_id_key" ON "experiment_override"("experiment_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "experiment_override" ADD CONSTRAINT "experiment_override_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
