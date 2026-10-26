/**
 * Schema: notifications, safety/moderation. PRD §11.1.
 */
import { pgTable, uuid, varchar, text, timestamp, pgEnum, smallint, boolean, jsonb, uniqueIndex, index, primaryKey, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── enums ───────────────────────────────────────────────────────
export const activityCategoryEnum = pgEnum('activity_category', ['social', 'spots', 'venue', 'promo', 'proximity', 'system']);
export const pushPlatformEnum = pgEnum('push_platform', ['ios', 'android', 'web']);

// ── notifications ───────────────────────────────────────────────
export const activityItems = pgTable('activity_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  category: activityCategoryEnum('category').notNull(),
  type: varchar('type', { length: 40 }).notNull(),
  payload: jsonb('payload'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('activity_items_user_idx').on(t.userId, sql`${t.createdAt} DESC`)]);

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id').primaryKey(),
  promoOptIn: boolean('promo_opt_in').notNull().default(false),
  promoConsentAt: timestamp('promo_consent_at', { withTimezone: true }),
  proximityOptIn: boolean('proximity_opt_in').notNull().default(false),
  quietHours: boolean('quiet_hours').notNull().default(true),
  categories: jsonb('categories'),
});

export const merchantMutes = pgTable('merchant_mutes', {
  userId: uuid('user_id').notNull(),
  merchantId: uuid('merchant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.merchantId] })]);

export const proximityLog = pgTable('proximity_log', {
  userId: uuid('user_id').notNull(),
  sentOn: date('sent_on').notNull(), // max 1/day enforced by pk
  venueId: uuid('venue_id').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.sentOn] })]);

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  platform: pushPlatformEnum('platform').notNull(),
  token: text('token').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('push_tokens_token_idx').on(t.token),
  index('push_tokens_user_idx').on(t.userId),
]);

// ── safety / moderation ─────────────────────────────────────────
export const blocks = pgTable('blocks', {
  blockerId: uuid('blocker_id').notNull(),
  blockedId: uuid('blocked_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.blockerId, t.blockedId] }),
  index('blocks_blocked_idx').on(t.blockedId),
]);

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').notNull(),
  targetType: varchar('target_type', { length: 20 }).notNull(), // user|message|spot|venue
  targetId: uuid('target_id').notNull(),
  reason: varchar('reason', { length: 40 }).notNull(),
  details: varchar('details', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('reports_target_idx').on(t.targetType, t.targetId, t.status)]);

export const moderationActions = pgTable('moderation_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').notNull(),
  targetUser: uuid('target_user').notNull(),
  action: varchar('action', { length: 20 }).notNull(), // warn|mute|suspend
  reason: varchar('reason', { length: 200 }).notNull(),
  audit: jsonb('audit'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const safetyRatings = pgTable('safety_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotId: uuid('spot_id').notNull(),
  raterId: uuid('rater_id').notNull(),
  ratedUserId: uuid('rated_user_id').notNull(),
  rating: smallint('rating').notNull(), // 1..5, private forever
  flag: boolean('flag').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('safety_ratings_unique_idx').on(t.spotId, t.raterId, t.ratedUserId)]);

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(),
  action: varchar('action', { length: 60 }).notNull(),
  target: varchar('target', { length: 120 }).notNull(),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('audit_log_actor_idx').on(t.actorId, t.createdAt)]);
