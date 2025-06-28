CREATE TABLE IF NOT EXISTS "ranks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier_name" varchar NOT NULL,
	"sub_tier" integer NOT NULL,
	"xp_required" integer NOT NULL,
	"icon_url" varchar
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rank_xp" integer DEFAULT 0 NOT NULL;