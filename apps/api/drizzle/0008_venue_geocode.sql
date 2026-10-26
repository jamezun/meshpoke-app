ALTER TABLE "venues" ADD COLUMN "closed_at" timestamp with time zone;
ALTER TABLE "venues" ADD COLUMN "geocode_status" varchar(20) DEFAULT 'pending' NOT NULL;
ALTER TABLE "venues" ADD COLUMN "fehd_district" varchar(40);
