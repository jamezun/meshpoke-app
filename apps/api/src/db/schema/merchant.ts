/**
 * Schema: merchants, memberships, drops, billing. PRD §11.1.
 */
import { pgTable, uuid, varchar, timestamp, pgEnum, integer, smallint, numeric, boolean, jsonb, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { venues } from './core.js';

// ── enums ───────────────────────────────────────────────────────
export const claimStatusEnum = pgEnum('claim_status', ['pending', 'approved', 'rejected']);
export const merchantTierEnum = pgEnum('merchant_tier', ['starter', 'growth', 'pro']);
export const ladderTemplateEnum = pgEnum('ladder_template', ['cafe', 'bar', 'restaurant', 'fine_dining', 'custom']);
export const membershipKindEnum = pgEnum('membership_kind', ['member', 'founding_circle']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'released', 'waitlisted']);
export const dropKindEnum = pgEnum('drop_kind', ['individual', 'group']);
export const dropStatusEnum = pgEnum('drop_status', ['draft', 'active', 'paused', 'ended']);
export const checkinContextEnum = pgEnum('checkin_context', ['drop', 'group_drop', 'member_visit']);
export const confidenceEnum = pgEnum('checkin_confidence', ['high', 'low']);
export const seatEventTypeEnum = pgEnum('seat_event_type', ['drop_seat', 'group_drop_seat', 'new_member_visit']);

// ── merchant accounts ───────────────────────────────────────────
export const merchantAccounts = pgTable('merchant_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull(),
  venueId: uuid('venue_id').notNull().references(() => venues.id),
  businessRegCertKey: varchar('business_reg_cert_key', { length: 200 }).notNull(), // R2 object key
  claimStatus: claimStatusEnum('claim_status').notNull().default('pending'),
  tier: merchantTierEnum('tier').notNull().default('starter'),
  founding: boolean('founding').notNull().default(false),
  priceBand: smallint('price_band').notNull().default(1), // 1..6 (declared, audited)
  bandAuditedAt: timestamp('band_audited_at', { withTimezone: true }),
  foundingDropsStartAt: timestamp('founding_drops_start_at', { withTimezone: true }),
  foundingFreeUntil: timestamp('founding_free_until', { withTimezone: true }),
  monthlyBudgetCap: integer('monthly_budget_cap'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 60 }),
  billingState: varchar('billing_state', { length: 30 }).notNull().default('ok'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('merchant_accounts_venue_idx').on(t.venueId),
  check('merchant_price_band_check', sql`${t.priceBand} BETWEEN 1 AND 6`),
]);

export const merchantStaff = pgTable('merchant_staff', {
  merchantId: uuid('merchant_id').notNull().references(() => merchantAccounts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 10 }).notNull().default('staff'), // owner|staff
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.merchantId, t.userId] })]);

// ── loyalty ladder ──────────────────────────────────────────────
export const ladderConfigs = pgTable('ladder_configs', {
  venueId: uuid('venue_id').primaryKey().references(() => venues.id, { onDelete: 'cascade' }),
  template: ladderTemplateEnum('template').notNull(),
  inactivityDays: smallint('inactivity_days').notNull().default(60),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ladderLevels = pgTable('ladder_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  position: smallint('position').notNull(),
  name: varchar('name', { length: 40 }).notNull(),
  minVisits: integer('min_visits').notNull(),
  minMonths: integer('min_months').notNull().default(0),
  discountPct: numeric('discount_pct'), // null = perk-only level; informational below 20%
  perkText: varchar('perk_text', { length: 200 }),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('ladder_levels_pos_idx').on(t.venueId, t.position)]);

// ── memberships ─────────────────────────────────────────────────
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  kind: membershipKindEnum('kind').notNull(),
  levelPosition: smallint('level_position').notNull().default(0),
  visitsCount: integer('visits_count').notNull().default(0),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  lastVisitAt: timestamp('last_visit_at', { withTimezone: true }),
  joinedViaMeshpoke: boolean('joined_via_meshpoke').notNull().default(true),
  attributionUntil: timestamp('attribution_until', { withTimezone: true }),
  attributionVisitsBilled: smallint('attribution_visits_billed').notNull().default(0),
  status: membershipStatusEnum('status').notNull().default('active'),
  releasedAt: timestamp('released_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('memberships_active_unique_idx').on(t.venueId, t.userId).where(sql`status = 'active'`),
  index('memberships_user_idx').on(t.userId, t.status),
  index('memberships_venue_idx').on(t.venueId, t.status),
]);

// ── coupons & drops ─────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  offer: jsonb('offer').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
});

export const drops = pgTable('drops', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  kind: dropKindEnum('kind').notNull(),
  title: varchar('title', { length: 80 }).notNull(),
  offerText: varchar('offer_text', { length: 300 }).notNull(),
  perkCostEstimate: numeric('perk_cost_estimate'),
  capacity: integer('capacity').notNull(),
  claimedCount: integer('claimed_count').notNull().default(0),
  minGroupSize: smallint('min_group_size'),
  sponsored: boolean('sponsored').notNull().default(false),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: dropStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('drops_active_idx').on(t.venueId, t.status, t.startsAt)]);

export const dropClaims = pgTable('drop_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  dropId: uuid('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  spotId: uuid('spot_id'),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
}, (t) => [uniqueIndex('drop_claims_unique_idx').on(t.dropId, t.userId)]);

// ── merchant check-ins & seat charges ──────────────────────────
export const merchantCheckins = pgTable('merchant_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  scannedBy: uuid('scanned_by').notNull(),
  context: checkinContextEnum('context').notNull(),
  dropId: uuid('drop_id'),
  spotId: uuid('spot_id'),
  confidence: confidenceEnum('confidence').notNull(),
  gpsDistanceM: numeric('gps_distance_m'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('merchant_checkins_idx').on(t.venueId, t.createdAt)]);

export const seatCharges = pgTable('seat_charges', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchantAccounts.id, { onDelete: 'cascade' }),
  venueId: uuid('venue_id').notNull(),
  checkinId: uuid('checkin_id').notNull(),
  eventType: seatEventTypeEnum('event_type').notNull(),
  band: smallint('band').notNull(),
  baseFee: integer('base_fee').notNull(),
  multiplier: numeric('multiplier').notNull().default('1'),
  amount: integer('amount').notNull(),
  shadow: boolean('shadow').notNull().default(false), // founding month 1: shown, not charged
  invoiceId: uuid('invoice_id'),
  disputedAt: timestamp('disputed_at', { withTimezone: true }),
  disputeStatus: varchar('dispute_status', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('seat_charges_checkin_idx').on(t.checkinId),
  index('seat_charges_invoice_idx').on(t.merchantId, t.invoiceId),
]);

// ── billing / entitlements ──────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  channel: varchar('channel', { length: 30 }).notNull(), // stripe_web|revenuecat_apple|revenuecat_google
  product: varchar('product', { length: 40 }).notNull(),
  pricePaid: integer('price_paid').notNull(), // HKD
  status: varchar('status', { length: 20 }).notNull(),
  providerRef: varchar('provider_ref', { length: 120 }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('subscriptions_provider_ref_idx').on(t.providerRef),
  index('subscriptions_user_idx').on(t.userId, t.status),
]);

export const entitlements = pgTable('entitlements', {
  userId: uuid('user_id').primaryKey(),
  plan: varchar('plan', { length: 10 }).notNull().default('free'), // free|plus|pro
  source: varchar('source', { length: 30 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const grants = pgTable('grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  kind: varchar('kind', { length: 30 }).notNull(), // host_reward_pro|pass7|filter_pass
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
}, (t) => [index('grants_user_idx').on(t.userId, t.kind)]);

export const foundingCounters = pgTable('founding_counters', {
  key: varchar('key', { length: 30 }).primaryKey(), // consumer_500 | merchant_50
  used: integer('used').notNull().default(0),
  max: integer('max').notNull(),
});

export const merchantSubscriptions = pgTable('merchant_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchantAccounts.id, { onDelete: 'cascade' }),
  product: varchar('product', { length: 40 }).notNull(),
  price: integer('price').notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  stripeRef: varchar('stripe_ref', { length: 120 }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
}, (t) => [index('merchant_subs_idx').on(t.merchantId, t.status)]);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchantAccounts.id, { onDelete: 'cascade' }),
  period: varchar('period', { length: 7 }).notNull(), // YYYY-MM
  saasAmount: integer('saas_amount').notNull().default(0),
  seatAmount: integer('seat_amount').notNull().default(0),
  shadowAmount: integer('shadow_amount').notNull().default(0),
  total: integer('total').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  stripeInvoiceRef: varchar('stripe_invoice_ref', { length: 120 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (t) => [uniqueIndex('invoices_period_idx').on(t.merchantId, t.period)]);
