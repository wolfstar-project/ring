-- CreateTable
CREATE TABLE "guild" (
    "id" BIGINT NOT NULL,
    "maximum_youtube_subscriptions" SMALLINT NOT NULL DEFAULT 3,
    "maximum_twitch_subscriptions" SMALLINT NOT NULL DEFAULT 5,
    "maximum_filtered_words" SMALLINT NOT NULL DEFAULT 50,
    "maximum_filtered_reactions" SMALLINT NOT NULL DEFAULT 50,
    "maximum_allowed_links" SMALLINT NOT NULL DEFAULT 25,
    "maximum_allowed_invite_codes" SMALLINT NOT NULL DEFAULT 25,
    "maximum_tag_count" SMALLINT NOT NULL DEFAULT 50,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("id")
);
