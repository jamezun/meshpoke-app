CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;--> statement-breakpoint
CREATE TYPE "public"."auth_provider" AS ENUM('apple', 'google', 'email');--> statement-breakpoint
CREATE TYPE "public"."liveness_state" AS ENUM('none', 'pending', 'verified');--> statement-breakpoint
CREATE TYPE "public"."pin_tier" AS ENUM('standard', 'rich', 'branded');--> statement-breakpoint
CREATE TYPE "public"."venue_category" AS ENUM('restaurant', 'cafe', 'bar', 'dessert', 'fast_food', 'convenience', 'sports', 'outdoor', 'education', 'retail', 'service', 'other');--> statement-breakpoint
CREATE TYPE "public"."venue_report_kind" AS ENUM('wrong_pin', 'closed', 'duplicate', 'other');--> statement-breakpoint
CREATE TYPE "public"."venue_report_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."venue_source" AS ENUM('fehd', 'user', 'merchant');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('active', 'closed', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."work_badge" AS ENUM('none', 'email', 'linkedin');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" varchar(60) NOT NULL,
	"name_zh" varchar(60) NOT NULL,
	"boundary" geography(MultiPolygon,4326) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"keyword" "citext" NOT NULL,
	"level" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "keywords_level_check" CHECK ("keywords"."level" BETWEEN 1 AND 10)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"industry" varchar(30) NOT NULL,
	"role_oneliner" varchar(40),
	"prompts" jsonb,
	"photos" jsonb,
	"hide_photo_in_rooms" boolean DEFAULT false NOT NULL,
	"socials" jsonb,
	"work_badge" "work_badge" DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_venues" (
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_venues_user_id_venue_id_pk" PRIMARY KEY("user_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"auth_provider" "auth_provider" NOT NULL,
	"display_name" varchar(40) NOT NULL,
	"date_of_birth" date NOT NULL,
	"phone_e164" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"liveness_state" "liveness_state" DEFAULT 'none' NOT NULL,
	"referral_code" varchar(12) NOT NULL,
	"referred_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "venue_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"kind" "venue_report_kind" NOT NULL,
	"details" varchar(500),
	"status" "venue_report_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "venue_source" NOT NULL,
	"fehd_licence_no" varchar(40),
	"licence_type" varchar(40),
	"legal_name" varchar(120),
	"display_name" varchar(120) NOT NULL,
	"category" "venue_category" NOT NULL,
	"address_en" varchar(200),
	"address_zh" varchar(200),
	"location" geography(Point,4326) NOT NULL,
	"district_id" uuid,
	"status" "venue_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"claimed_by_merchant_id" uuid,
	"profile" jsonb,
	"pin_tier" "pin_tier" DEFAULT 'standard' NOT NULL,
	"last_imported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_venues" ADD CONSTRAINT "saved_venues_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_reports" ADD CONSTRAINT "venue_reports_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "districts_name_en_idx" ON "districts" USING btree ("name_en");--> statement-breakpoint
CREATE UNIQUE INDEX "keywords_user_keyword_idx" ON "keywords" USING btree ("user_id","keyword");--> statement-breakpoint
CREATE INDEX "keywords_keyword_idx" ON "keywords" USING btree ("keyword");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_fehd_licence_idx" ON "venues" USING btree ("fehd_licence_no");--> statement-breakpoint
CREATE INDEX "venues_district_idx" ON "venues" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX "venues_category_idx" ON "venues" USING btree ("category");
--> statement-breakpoint
-- Keyword caps (BM §3): max 10 per user, max 3 at level >= 8.
CREATE OR REPLACE FUNCTION keywords_caps() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM keywords WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'keyword cap reached (10)' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.level >= 8 AND (SELECT count(*) FROM keywords WHERE user_id = NEW.user_id AND level >= 8) >= 3 THEN
    RAISE EXCEPTION 'level-8 keyword cap reached (3)' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER keywords_caps_trigger
BEFORE INSERT OR UPDATE OF level ON keywords
FOR EACH ROW EXECUTE FUNCTION keywords_caps();
