/**
 * Core schema: identity, profile, geography. PRD §11.1.
 * users.id mirrors Supabase GoTrue auth.users.id (same UUID) — FK omitted so
 * tests can run on plain PostGIS without the auth schema.
 */
import { pgTable, uuid, varchar, timestamp, date, pgEnum, smallint, boolean, jsonb, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { geographyPoint, geographyMultiPolygon } from '../geo.js';
import { citext } from '../citext.js';

// ── enums ───────────────────────────────────────────────────────
export const authProviderEnum = pgEnum('auth_provider', ['apple', 'google', 'email']);
export const livenessStateEnum = pgEnum('liveness_state', ['none', 'pending', 'verified']);
export const workBadgeEnum = pgEnum('work_badge', ['none', 'email', 'linkedin']);
export const venueSourceEnum = pgEnum('venue_source', ['fehd', 'user', 'merchant']);
export const venueCategoryEnum = pgEnum('venue_category', [
  'restaurant', 'cafe', 'bar', 'dessert', 'fast_food', 'convenience',
  'sports', 'outdoor', 'education', 'retail', 'service', 'other',
]);
export const venueStatusEnum = pgEnum('venue_status', ['active', 'closed', 'hidden']);
export const pinTierEnum = pgEnum('pin_tier', ['standard', 'rich', 'branded']);
export const venueReportKindEnum = pgEnum('venue_report_kind', ['wrong_pin', 'closed', 'duplicate', 'other']);
export const venueReportStatusEnum = pgEnum('venue_report_status', ['open', 'resolved', 'dismissed']);

// ── identity ────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = auth.users.id
  email: varchar('email', { length: 320 }).notNull(),
  authProvider: authProviderEnum('auth_provider').notNull(),
  displayName: varchar('display_name', { length: 40 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(), // age >= 18 checked in API
  phoneE164: varchar('phone_e164', { length: 20 }), // PII: encrypted at rest via helper (T1.5), unique hash column added then
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  livenessState: livenessStateEnum('liveness_state').notNull().default('none'),
  referralCode: varchar('referral_code', { length: 12 }).notNull(),
  referredBy: uuid('referred_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('users_referral_code_idx').on(t.referralCode),
]);

// ── profile ─────────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id),
  industry: varchar('industry', { length: 30 }).notNull(), // dropdown values validated in API (10 options)
  roleOneliner: varchar('role_oneliner', { length: 40 }),
  prompts: jsonb('prompts'), // [{ prompt, answer }] max 3
  photos: jsonb('photos'), // private; served via signed URLs
  hidePhotoInRooms: boolean('hide_photo_in_rooms').notNull().default(false),
  socials: jsonb('socials'), // { instagram?, linkedin? } revealed only at full-profile moment
  workBadge: workBadgeEnum('work_badge').notNull().default('none'),
});

export const keywords = pgTable('keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyword: citext('keyword').notNull(),
  level: smallint('level').notNull().default(1), // 1..10
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('keywords_user_keyword_idx').on(t.userId, t.keyword),
  index('keywords_keyword_idx').on(t.keyword),
  check('keywords_level_check', sql`${t.level} BETWEEN 1 AND 10`),
]);

// ── geography ───────────────────────────────────────────────────
export const districts = pgTable('districts', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameEn: varchar('name_en', { length: 60 }).notNull(),
  nameZh: varchar('name_zh', { length: 60 }).notNull(),
  boundary: geographyMultiPolygon('boundary').notNull(),
}, (t) => [uniqueIndex('districts_name_en_idx').on(t.nameEn)]);

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: venueSourceEnum('source').notNull(),
  fehdLicenceNo: varchar('fehd_licence_no', { length: 40 }),
  licenceType: varchar('licence_type', { length: 40 }),
  legalName: varchar('legal_name', { length: 120 }),
  displayName: varchar('display_name', { length: 120 }).notNull(),
  category: venueCategoryEnum('category').notNull(),
  addressEn: varchar('address_en', { length: 200 }),
  addressZh: varchar('address_zh', { length: 200 }),
  location: geographyPoint('location').notNull(),
  districtId: uuid('district_id').references(() => districts.id),
  status: venueStatusEnum('status').notNull().default('active'),
  createdBy: uuid('created_by'),
  claimedByMerchantId: uuid('claimed_by_merchant_id'),
  profile: jsonb('profile'),
  pinTier: pinTierEnum('pin_tier').notNull().default('standard'),
  lastImportedAt: timestamp('last_imported_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('venues_fehd_licence_idx').on(t.fehdLicenceNo),
  index('venues_district_idx').on(t.districtId),
  index('venues_category_idx').on(t.category),
]);

export const venueReports = pgTable('venue_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id').notNull(),
  kind: venueReportKindEnum('kind').notNull(),
  details: varchar('details', { length: 500 }),
  status: venueReportStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const savedVenues = pgTable('saved_venues', {
  userId: uuid('user_id').notNull(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.venueId] }),
]);
