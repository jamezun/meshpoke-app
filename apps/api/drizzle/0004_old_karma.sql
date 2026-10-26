ALTER TABLE "users" ALTER COLUMN "phone_e164" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_hash" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_hash_idx" ON "users" USING btree ("phone_hash");