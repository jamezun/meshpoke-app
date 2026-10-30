-- B4: track whether the host ran roll-call (unverified default-attended doesn't move scores without it)
ALTER TABLE "spots" ADD COLUMN IF NOT EXISTS "roll_call_at" timestamp with time zone;
