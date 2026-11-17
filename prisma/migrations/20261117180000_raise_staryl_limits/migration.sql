-- Staryl's free limits rise to 10 YouTube, 15 Twitch live and 30 Reddit subscriptions per guild,
-- and the paid tiers move above them. A guild stored with less is raised to the new free value:
-- a stored limit is a floor the guild already had, never a reason to give it less than others.

-- AlterTable
ALTER TABLE "guild" ALTER COLUMN "maximum_youtube_subscriptions" SET DEFAULT 10,
ALTER COLUMN "maximum_twitch_subscriptions" SET DEFAULT 15,
ADD COLUMN "maximum_reddit_subscriptions" SMALLINT NOT NULL DEFAULT 30;

-- Raise the guilds below the new free values
UPDATE "guild" SET "maximum_youtube_subscriptions" = 10 WHERE "maximum_youtube_subscriptions" < 10;
UPDATE "guild" SET "maximum_twitch_subscriptions" = 15 WHERE "maximum_twitch_subscriptions" < 15;
