CREATE TYPE "public"."application_status" AS ENUM('pending', 'accepted', 'waitlisted', 'declined', 'closed');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('attended', 'absent_host', 'absent_reported', 'forgiven');--> statement-breakpoint
CREATE TYPE "public"."confirm_state" AS ENUM('pending', 'confirmed', 'bailed');--> statement-breakpoint
CREATE TYPE "public"."join_mode" AS ENUM('open', 'application');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('host', 'member', 'waitlist');--> statement-breakpoint
CREATE TYPE "public"."member_state" AS ENUM('active', 'left', 'removed');--> statement-breakpoint
CREATE TYPE "public"."poke_cost_type" AS ENUM('weekly', 'credit', 'free_post_spot', 'free_poke_back');--> statement-breakpoint
CREATE TYPE "public"."poke_source" AS ENUM('map', 'room', 'people_you_met', 'profile', 'inbox');--> statement-breakpoint
CREATE TYPE "public"."poke_status" AS ENUM('pending', 'returned', 'expired');--> statement-breakpoint
CREATE TYPE "public"."proven_state" AS ENUM('unproven', 'proven', 'top');--> statement-breakpoint
CREATE TYPE "public"."room_kind" AS ENUM('event', 'chat', 'crew', 'dm', 'city');--> statement-breakpoint
CREATE TYPE "public"."room_role" AS ENUM('host', 'member', 'merchant');--> statement-breakpoint
CREATE TYPE "public"."score_event_type" AS ENUM('attended', 'no_show', 'late_cancel', 'forgiven', 'host_cancel', 'verified_gps');--> statement-breakpoint
CREATE TYPE "public"."spot_kind" AS ENUM('event', 'chat');--> statement-breakpoint
CREATE TYPE "public"."spot_state" AS ENUM('forming', 'confirmed', 'live', 'done', 'dissolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."spot_template" AS ENUM('dinner', 'drinks', 'coffee', 'hike', 'run', 'tennis', 'pickleball', 'badminton', 'board_games', 'industry_mingle', 'open_sport');--> statement-breakpoint
CREATE TABLE "absence_reports" (
	"spot_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absence_reports_spot_id_reporter_id_subject_id_pk" PRIMARY KEY("spot_id","reporter_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" varchar(500),
	"status" "application_status" DEFAULT 'pending' NOT NULL,
	"decline_reason" varchar(200),
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"spot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"verified_gps" boolean DEFAULT false NOT NULL,
	"im_here_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"forgiveness_note" varchar(500),
	CONSTRAINT "attendance_spot_id_user_id_pk" PRIMARY KEY("spot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a" uuid NOT NULL,
	"user_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"disconnected_at" timestamp with time zone,
	"disconnected_by" uuid
);
--> statement-breakpoint
CREATE TABLE "crew_members" (
	"crew_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "crew_members_crew_id_user_id_pk" PRIMARY KEY("crew_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_spot_id" uuid NOT NULL,
	"name" varchar(60) NOT NULL,
	"whatsapp_url" varchar(500),
	"dormant_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hosting_capacity" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"max_active" smallint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"flags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poke_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weekly_used" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pokes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user" uuid NOT NULL,
	"to_user" uuid NOT NULL,
	"note" varchar(500),
	"source" "poke_source" NOT NULL,
	"spot_id" uuid,
	"cost_type" "poke_cost_type" NOT NULL,
	"status" "poke_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crew_id" uuid NOT NULL,
	"poll_options" jsonb NOT NULL,
	"votes" jsonb,
	"new_spot_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"verified_reward_at" timestamp with time zone,
	"attended_reward_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "room_role" DEFAULT 'member' NOT NULL,
	"muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "room_members_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "room_kind" NOT NULL,
	"spot_id" uuid,
	"crew_id" uuid,
	"merchant_id" uuid,
	"district_id" uuid,
	"decay_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"spot_id" uuid,
	"type" "score_event_type" NOT NULL,
	"weight" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showup_scores" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"score" numeric NOT NULL,
	"events_count" integer NOT NULL,
	"proven_state" "proven_state" DEFAULT 'unproven' NOT NULL,
	"factors" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spot_members" (
	"spot_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"state" "member_state" DEFAULT 'active' NOT NULL,
	"confirm_state" "confirm_state",
	"bailed_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spot_members_spot_id_user_id_pk" PRIMARY KEY("spot_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "spot_kind" NOT NULL,
	"host_user_id" uuid,
	"host_merchant_id" uuid,
	"template" "spot_template",
	"name" varchar(60) NOT NULL,
	"required_keywords" text[],
	"min_score" numeric,
	"price_range" varchar(40),
	"join_mode" "join_mode" NOT NULL,
	"district_id" uuid,
	"venue_id" uuid,
	"group_drop_id" uuid,
	"state" "spot_state",
	"min_headcount" smallint NOT NULL,
	"max_headcount" smallint NOT NULL,
	"overbook_buffer" smallint DEFAULT 0 NOT NULL,
	"date_range" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"confirm_deadline" timestamp with time zone,
	"external_link" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spots_headcount_check" CHECK ("spots"."min_headcount" >= 2 AND "spots"."max_headcount" >= "spots"."min_headcount")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rebooks" ADD CONSTRAINT "rebooks_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spot_members" ADD CONSTRAINT "spot_members_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spots" ADD CONSTRAINT "spots_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_queue_idx" ON "applications" USING btree ("spot_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_unique_idx" ON "applications" USING btree ("spot_id","user_id");--> statement-breakpoint
CREATE INDEX "messages_room_idx" ON "messages" USING btree ("room_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "pokes_to_idx" ON "pokes" USING btree ("to_user","status","created_at");--> statement-breakpoint
CREATE INDEX "pokes_pending_expiry_idx" ON "pokes" USING btree ("expires_at") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_referee_idx" ON "referrals" USING btree ("referee_id");--> statement-breakpoint
CREATE INDEX "rooms_kind_idx" ON "rooms" USING btree ("kind","district_id");--> statement-breakpoint
CREATE INDEX "score_events_user_idx" ON "score_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "spot_members_user_idx" ON "spot_members" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "spots_browse_idx" ON "spots" USING btree ("kind","state","district_id","starts_at");--> statement-breakpoint
CREATE INDEX "spots_venue_idx" ON "spots" USING btree ("venue_id");
--> statement-breakpoint
-- Undirected pair uniqueness for connections (drizzle-kit cannot express functional indexes).
CREATE UNIQUE INDEX "connections_pair_idx" ON "connections" (least("user_a","user_b"), greatest("user_a","user_b"));--> statement-breakpoint
-- tstzrange for spot date windows (raw range type; API constructs bounds).
