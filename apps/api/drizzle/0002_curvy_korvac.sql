CREATE TYPE "public"."checkin_context" AS ENUM('drop', 'group_drop', 'member_visit');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."checkin_confidence" AS ENUM('high', 'low');--> statement-breakpoint
CREATE TYPE "public"."drop_kind" AS ENUM('individual', 'group');--> statement-breakpoint
CREATE TYPE "public"."drop_status" AS ENUM('draft', 'active', 'paused', 'ended');--> statement-breakpoint
CREATE TYPE "public"."ladder_template" AS ENUM('cafe', 'bar', 'restaurant', 'fine_dining', 'custom');--> statement-breakpoint
CREATE TYPE "public"."membership_kind" AS ENUM('member', 'founding_circle');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'released', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."merchant_tier" AS ENUM('starter', 'growth', 'pro');--> statement-breakpoint
CREATE TYPE "public"."seat_event_type" AS ENUM('drop_seat', 'group_drop_seat', 'new_member_visit');--> statement-breakpoint
CREATE TYPE "public"."activity_category" AS ENUM('social', 'spots', 'venue', 'promo', 'proximity', 'system');--> statement-breakpoint
CREATE TYPE "public"."push_platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"offer" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drop_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"spot_id" uuid,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"kind" "drop_kind" NOT NULL,
	"title" varchar(80) NOT NULL,
	"offer_text" varchar(300) NOT NULL,
	"perk_cost_estimate" numeric,
	"capacity" integer NOT NULL,
	"claimed_count" integer DEFAULT 0 NOT NULL,
	"min_group_size" smallint,
	"sponsored" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "drop_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" varchar(10) DEFAULT 'free' NOT NULL,
	"source" varchar(30) NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founding_counters" (
	"key" varchar(30) PRIMARY KEY NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"max" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" varchar(30) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"saas_amount" integer DEFAULT 0 NOT NULL,
	"seat_amount" integer DEFAULT 0 NOT NULL,
	"shadow_amount" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"stripe_invoice_ref" varchar(120),
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ladder_configs" (
	"venue_id" uuid PRIMARY KEY NOT NULL,
	"template" "ladder_template" NOT NULL,
	"inactivity_days" smallint DEFAULT 60 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladder_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"name" varchar(40) NOT NULL,
	"min_visits" integer NOT NULL,
	"min_months" integer DEFAULT 0 NOT NULL,
	"discount_pct" numeric,
	"perk_text" varchar(200),
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "membership_kind" NOT NULL,
	"level_position" smallint DEFAULT 0 NOT NULL,
	"visits_count" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_visit_at" timestamp with time zone,
	"joined_via_meshpoke" boolean DEFAULT true NOT NULL,
	"attribution_until" timestamp with time zone,
	"attribution_visits_billed" smallint DEFAULT 0 NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "merchant_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"business_reg_cert_key" varchar(200) NOT NULL,
	"claim_status" "claim_status" DEFAULT 'pending' NOT NULL,
	"tier" "merchant_tier" DEFAULT 'starter' NOT NULL,
	"founding" boolean DEFAULT false NOT NULL,
	"price_band" smallint DEFAULT 1 NOT NULL,
	"band_audited_at" timestamp with time zone,
	"founding_drops_start_at" timestamp with time zone,
	"founding_free_until" timestamp with time zone,
	"monthly_budget_cap" integer,
	"stripe_customer_id" varchar(60),
	"billing_state" varchar(30) DEFAULT 'ok' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_price_band_check" CHECK ("merchant_accounts"."price_band" BETWEEN 1 AND 6)
);
--> statement-breakpoint
CREATE TABLE "merchant_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scanned_by" uuid NOT NULL,
	"context" "checkin_context" NOT NULL,
	"drop_id" uuid,
	"spot_id" uuid,
	"confidence" "checkin_confidence" NOT NULL,
	"gps_distance_m" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_staff" (
	"merchant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(10) DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_staff_merchant_id_user_id_pk" PRIMARY KEY("merchant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "merchant_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product" varchar(40) NOT NULL,
	"price" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"stripe_ref" varchar(120) NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"checkin_id" uuid NOT NULL,
	"event_type" "seat_event_type" NOT NULL,
	"band" smallint NOT NULL,
	"base_fee" integer NOT NULL,
	"multiplier" numeric DEFAULT '1' NOT NULL,
	"amount" integer NOT NULL,
	"shadow" boolean DEFAULT false NOT NULL,
	"invoice_id" uuid,
	"disputed_at" timestamp with time zone,
	"dispute_status" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" varchar(30) NOT NULL,
	"product" varchar(40) NOT NULL,
	"price_paid" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"provider_ref" varchar(120) NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "activity_category" NOT NULL,
	"type" varchar(40) NOT NULL,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(60) NOT NULL,
	"target" varchar(120) NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "merchant_mutes" (
	"user_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_mutes_user_id_merchant_id_pk" PRIMARY KEY("user_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"target_user" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"reason" varchar(200) NOT NULL,
	"audit" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"promo_opt_in" boolean DEFAULT false NOT NULL,
	"promo_consent_at" timestamp with time zone,
	"proximity_opt_in" boolean DEFAULT false NOT NULL,
	"quiet_hours" boolean DEFAULT true NOT NULL,
	"categories" jsonb
);
--> statement-breakpoint
CREATE TABLE "proximity_log" (
	"user_id" uuid NOT NULL,
	"sent_on" date NOT NULL,
	"venue_id" uuid NOT NULL,
	CONSTRAINT "proximity_log_user_id_sent_on_pk" PRIMARY KEY("user_id","sent_on")
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "push_platform" NOT NULL,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" varchar(40) NOT NULL,
	"details" varchar(500),
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"rated_user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"flag" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_claims" ADD CONSTRAINT "drop_claims_drop_id_drops_id_fk" FOREIGN KEY ("drop_id") REFERENCES "public"."drops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_configs" ADD CONSTRAINT "ladder_configs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_levels" ADD CONSTRAINT "ladder_levels_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_accounts" ADD CONSTRAINT "merchant_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_checkins" ADD CONSTRAINT "merchant_checkins_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_staff" ADD CONSTRAINT "merchant_staff_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_subscriptions" ADD CONSTRAINT "merchant_subscriptions_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_charges" ADD CONSTRAINT "seat_charges_merchant_id_merchant_accounts_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchant_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drop_claims_unique_idx" ON "drop_claims" USING btree ("drop_id","user_id");--> statement-breakpoint
CREATE INDEX "drops_active_idx" ON "drops" USING btree ("venue_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "grants_user_idx" ON "grants" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_period_idx" ON "invoices" USING btree ("merchant_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "ladder_levels_pos_idx" ON "ladder_levels" USING btree ("venue_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_active_unique_idx" ON "memberships" USING btree ("venue_id","user_id") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "memberships_venue_idx" ON "memberships" USING btree ("venue_id","status");--> statement-breakpoint
CREATE INDEX "merchant_accounts_venue_idx" ON "merchant_accounts" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "merchant_checkins_idx" ON "merchant_checkins" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "merchant_subs_idx" ON "merchant_subscriptions" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "seat_charges_checkin_idx" ON "seat_charges" USING btree ("checkin_id");--> statement-breakpoint
CREATE INDEX "seat_charges_invoice_idx" ON "seat_charges" USING btree ("merchant_id","invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_ref_idx" ON "subscriptions" USING btree ("provider_ref");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "activity_items_user_idx" ON "activity_items" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_tokens_user_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "safety_ratings_unique_idx" ON "safety_ratings" USING btree ("spot_id","rater_id","rated_user_id");