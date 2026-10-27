-- T17.2: consumer Stripe customer on users (web checkout)
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" varchar(120);
