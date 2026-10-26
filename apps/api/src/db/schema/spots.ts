/**
 * Schema: spots, attendance, trust, pokes, chat, crews. PRD §11.1.
 */
import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, smallint, numeric, boolean, jsonb, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { venues, districts } from './core.js';

// ── enums ───────────────────────────────────────────────────────
export const spotKindEnum = pgEnum('spot_kind', ['event', 'chat']);
export const spotTemplateEnum = pgEnum('spot_template', [
  'dinner', 'drinks', 'coffee', 'hike', 'run', 'tennis', 'pickleball',
  'badminton', 'board_games', 'industry_mingle', 'open_sport',
]);
export const joinModeEnum = pgEnum('join_mode', ['open', 'application']);
export const spotStateEnum = pgEnum('spot_state', ['forming', 'confirmed', 'live', 'done', 'dissolved', 'cancelled']);
export const memberRoleEnum = pgEnum('member_role', ['host', 'member', 'waitlist']);
export const memberStateEnum = pgEnum('member_state', ['active', 'left', 'removed']);
export const confirmStateEnum = pgEnum('confirm_state', ['pending', 'confirmed', 'bailed']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'accepted', 'waitlisted', 'declined', 'closed']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['attended', 'absent_host', 'absent_reported', 'forgiven']);
export const scoreEventTypeEnum = pgEnum('score_event_type', ['attended', 'no_show', 'late_cancel', 'forgiven', 'host_cancel', 'verified_gps']);
export const provenStateEnum = pgEnum('proven_state', ['unproven', 'proven', 'top']);
export const pokeSourceEnum = pgEnum('poke_source', ['map', 'room', 'people_you_met', 'profile', 'inbox']);
export const pokeCostTypeEnum = pgEnum('poke_cost_type', ['weekly', 'credit', 'free_post_spot', 'free_poke_back']);
export const pokeStatusEnum = pgEnum('poke_status', ['pending', 'returned', 'expired']);
export const roomKindEnum = pgEnum('room_kind', ['event', 'chat', 'crew', 'dm', 'city']);
export const roomRoleEnum = pgEnum('room_role', ['host', 'member', 'merchant']);

// ── spots ───────────────────────────────────────────────────────
export const spots = pgTable('spots', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: spotKindEnum('kind').notNull(),
  hostUserId: uuid('host_user_id'),
  hostMerchantId: uuid('host_merchant_id'),
  template: spotTemplateEnum('template'),
  name: varchar('name', { length: 60 }).notNull(),
  requiredKeywords: text('required_keywords').array(), // ≤ 3, checked in API + trigger later
  minScore: numeric('min_score'),
  priceRange: varchar('price_range', { length: 40 }), // informational
  joinMode: joinModeEnum('join_mode').notNull(),
  districtId: uuid('district_id').references(() => districts.id),
  venueId: uuid('venue_id').references(() => venues.id), // required once state=confirmed
  groupDropId: uuid('group_drop_id'),
  state: spotStateEnum('state'), // event spots only
  minHeadcount: smallint('min_headcount').notNull(),
  maxHeadcount: smallint('max_headcount').notNull(),
  overbookBuffer: smallint('overbook_buffer').notNull().default(0),
  dateRange: text('date_range'), // tstzrange literal; replaced by typed column later if needed
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  confirmDeadline: timestamp('confirm_deadline', { withTimezone: true }),
  externalLink: varchar('external_link', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('spots_browse_idx').on(t.kind, t.state, t.districtId, t.startsAt),
  index('spots_venue_idx').on(t.venueId),
  check('spots_headcount_check', sql`${t.minHeadcount} >= 2 AND ${t.maxHeadcount} >= ${t.minHeadcount}`),
]);

export const spotMembers = pgTable('spot_members', {
  spotId: uuid('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: memberRoleEnum('role').notNull(),
  state: memberStateEnum('state').notNull().default('active'),
  confirmState: confirmStateEnum('confirm_state'),
  bailedAt: timestamp('bailed_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.spotId, t.userId] }),
  index('spot_members_user_idx').on(t.userId, t.state),
]);

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotId: uuid('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  note: varchar('note', { length: 500 }),
  status: applicationStatusEnum('status').notNull().default('pending'),
  declineReason: varchar('decline_reason', { length: 200 }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('applications_queue_idx').on(t.spotId, t.status, t.createdAt),
  uniqueIndex('applications_unique_idx').on(t.spotId, t.userId),
]);

export const attendance = pgTable('attendance', {
  spotId: uuid('spot_id').notNull().references(() => spots.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  verifiedGps: boolean('verified_gps').notNull().default(false),
  imHereAt: timestamp('im_here_at', { withTimezone: true }),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  forgivenessNote: varchar('forgiveness_note', { length: 500 }),
}, (t) => [primaryKey({ columns: [t.spotId, t.userId] })]);

export const absenceReports = pgTable('absence_reports', {
  spotId: uuid('spot_id').notNull(),
  reporterId: uuid('reporter_id').notNull(),
  subjectId: uuid('subject_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.spotId, t.reporterId, t.subjectId] })]);

// ── trust ───────────────────────────────────────────────────────
export const scoreEvents = pgTable('score_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  spotId: uuid('spot_id'),
  type: scoreEventTypeEnum('type').notNull(),
  weight: numeric('weight').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('score_events_user_idx').on(t.userId, t.createdAt)]);

export const showupScores = pgTable('showup_scores', {
  userId: uuid('user_id').primaryKey(),
  score: numeric('score').notNull(),
  eventsCount: integer('events_count').notNull(),
  provenState: provenStateEnum('proven_state').notNull().default('unproven'),
  factors: jsonb('factors'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const hostingCapacity = pgTable('hosting_capacity', {
  userId: uuid('user_id').primaryKey(),
  maxActive: smallint('max_active').notNull().default(1), // 1/3/5, earned
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── pokes / connections ─────────────────────────────────────────
export const pokes = pgTable('pokes', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromUser: uuid('from_user').notNull(),
  toUser: uuid('to_user').notNull(),
  note: varchar('note', { length: 500 }),
  source: pokeSourceEnum('source').notNull(),
  spotId: uuid('spot_id'),
  costType: pokeCostTypeEnum('cost_type').notNull(),
  status: pokeStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('pokes_to_idx').on(t.toUser, t.status, t.createdAt),
  index('pokes_pending_expiry_idx').on(t.expiresAt).where(sql`status = 'pending'`),
]);

export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userA: uuid('user_a').notNull(),
  userB: uuid('user_b').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
  disconnectedBy: uuid('disconnected_by'),
});
// NOTE: unique pair index on (least, greatest) appended manually to the SQL migration
// (drizzle-kit cannot express functional unique indexes).

export const pokeBalances = pgTable('poke_balances', {
  userId: uuid('user_id').primaryKey(),
  weeklyUsed: integer('weekly_used').notNull().default(0),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }).notNull().defaultNow(),
  credits: integer('credits').notNull().default(0), // packs + referral, never expire weekly
});

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').notNull(),
  refereeId: uuid('referee_id').notNull(),
  verifiedRewardAt: timestamp('verified_reward_at', { withTimezone: true }),
  attendedRewardAt: timestamp('attended_reward_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('referrals_referee_idx').on(t.refereeId)]);

// ── chat ────────────────────────────────────────────────────────
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: roomKindEnum('kind').notNull(),
  spotId: uuid('spot_id'),
  crewId: uuid('crew_id'),
  merchantId: uuid('merchant_id'),
  districtId: uuid('district_id'),
  decayAt: timestamp('decay_at', { withTimezone: true }), // ~2wk decay
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('rooms_kind_idx').on(t.kind, t.districtId)]);

export const roomMembers = pgTable('room_members', {
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  role: roomRoleEnum('role').notNull().default('member'),
  muted: boolean('muted').notNull().default(false),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp('left_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.roomId, t.userId] })]);

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  body: text('body').notNull(),
  flags: jsonb('flags'), // link-detected, interstitial-shown, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('messages_room_idx').on(t.roomId, sql`${t.createdAt} DESC`)]);

// ── crews ───────────────────────────────────────────────────────
export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  originSpotId: uuid('origin_spot_id').notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  whatsappUrl: varchar('whatsapp_url', { length: 500 }),
  dormantAt: timestamp('dormant_at', { withTimezone: true }), // 60d inactivity
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const crewMembers = pgTable('crew_members', {
  crewId: uuid('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp('left_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.crewId, t.userId] })]);

export const rebooks = pgTable('rebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  crewId: uuid('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  pollOptions: jsonb('poll_options').notNull(),
  votes: jsonb('votes'),
  newSpotId: uuid('new_spot_id'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
