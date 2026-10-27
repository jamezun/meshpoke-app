import { sql } from 'drizzle-orm';
import { MERCHANT_PER_SEAT_BANDS, MERCHANT_RULES } from '@meshpoke/shared/constants';
import type { Db } from './db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/**
 * T16.1 seat charge engine — called by scan (T15.2) for high-confidence billable check-ins.
 * Idempotent by checkin_id (unique index).
 */
export async function onCheckin(db: Db, checkinId: string): Promise<{ charged: boolean; shadow: boolean; amount: number | null }> {
  const c = rows(await db.execute(sql`
    select mc.id, mc.venue_id, mc.user_id, mc.context, mc.confidence,
           ma.id as merchant_id, ma.price_band, ma.tier, ma.founding,
           ma.founding_drops_start_at, u.created_at as account_created, u.phone_verified_at
      from merchant_checkins mc
      join merchant_accounts ma on ma.venue_id = mc.venue_id
      join users u on u.id = mc.user_id
     where mc.id = ${checkinId}::uuid`));
  if (!c[0]) return { charged: false, shadow: false, amount: null };

  // verified-seat preconditions: high confidence + phone-verified account older than 7 days
  const accountAgeDays = (Date.now() - new Date(c[0].account_created as string).getTime()) / 86_400_000;
  if (c[0].confidence !== 'high' || !c[0].phone_verified_at || accountAgeDays < 7) {
    return { charged: false, shadow: false, amount: null };
  }

  // event type
  let eventType: 'drop_seat' | 'group_drop_seat' | 'new_member_visit';
  if (c[0].context === 'drop') eventType = 'drop_seat';
  else if (c[0].context === 'group_drop') eventType = 'group_drop_seat';
  else eventType = 'new_member_visit';

  // drop_seat: once per user per drop
  if (eventType === 'drop_seat') {
    const already = rows(await db.execute(sql`
      select 1 from seat_charges sc join merchant_checkins mc on mc.id = sc.checkin_id
       where sc.merchant_id = ${c[0].merchant_id}::uuid and mc.user_id = ${c[0].user_id}::uuid
         and mc.drop_id = (select drop_id from merchant_checkins where id = ${checkinId}::uuid) limit 1`));
    if (already[0]) return { charged: false, shadow: false, amount: null };
  }

  // band fee — price_band column IS the audited band number 1–6
  const bandNo = Math.min(6, Math.max(1, Number(c[0].price_band ?? 1)));
  const band = MERCHANT_PER_SEAT_BANDS[bandNo - 1];

  // sponsored multiplier: sponsored drop (individual) × MERCHANT_RULES.sponsoredMultiplier
  const chk = rows(await db.execute(sql`select drop_id from merchant_checkins where id = ${checkinId}::uuid`));
  let multiplier = 1;
  if (chk[0]?.drop_id) {
    const d = rows(await db.execute(sql`select sponsored from drops where id = ${chk[0].drop_id}::uuid`));
    multiplier = d[0]?.sponsored ? MERCHANT_RULES.sponsoredMultiplier : 1;
  }

  // shadow: founding month 1 → shown not charged
  const foundingStart = c[0].founding_drops_start_at ? new Date(c[0].founding_drops_start_at as string) : null;
  const shadow = Boolean(foundingStart) && Date.now() - foundingStart!.getTime() < 30 * 86_400_000;

  const amount = Math.round(band.feeHkd * multiplier);

  // idempotent insert
  const ins = rows(await db.execute(sql`
    insert into seat_charges (merchant_id, venue_id, checkin_id, event_type, band, base_fee, multiplier, amount, shadow)
    values (${c[0].merchant_id}::uuid, ${c[0].venue_id}::uuid, ${checkinId}::uuid, ${eventType}, ${bandNo}, ${band.feeHkd}, ${multiplier}, ${amount}, ${shadow})
    on conflict (checkin_id) do nothing
    returning id`));

  // roll into the current-month invoice
  if (ins[0]) {
    await db.execute(sql`
      insert into invoices (merchant_id, period, seat_amount, shadow_amount, total)
      values (${c[0].merchant_id}::uuid, to_char(now(), 'YYYY-MM'), ${shadow ? 0 : amount}, ${shadow ? amount : 0}, ${shadow ? 0 : amount})
      on conflict (merchant_id, period) do update set
        seat_amount = invoices.seat_amount + ${shadow ? 0 : amount},
        shadow_amount = invoices.shadow_amount + ${shadow ? amount : 0},
        total = invoices.total + ${shadow ? 0 : amount}`);
    return { charged: !shadow, shadow, amount: shadow ? 0 : amount };
  }
  return { charged: false, shadow, amount: null };
}

/** T16.2 founding clock: first drop go-live → founding_free_until = +3 months. */
export async function onDropActivated(db: Db, dropId: string): Promise<void> {
  await db.execute(sql`
    update merchant_accounts ma
       set founding_drops_start_at = coalesce(founding_drops_start_at, now()),
           founding_free_until = coalesce(founding_free_until, now() + interval '3 months')
     where ma.founding
       and (select d.starts_at from drops d where d.id = ${dropId}::uuid) >= now() - interval '1 minute'
       and not exists (select 1 from drops d2 where d2.venue_id = ma.venue_id and d2.starts_at < (select starts_at from drops where id = ${dropId}::uuid))`);
}
