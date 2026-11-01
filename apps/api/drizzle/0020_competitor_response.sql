-- M23 competitor-response: payment style, dietary tags, find-hint/icebreaker, venue-change consent
alter table spots add column payment_style varchar(20);
alter table spots add column payment_rules varchar(200);
alter table spots add column find_hint varchar(200);
alter table spots add column icebreaker varchar(200);

alter table profiles add column dietary text[] not null default '{}';
alter table profiles add column dietary_note varchar(80);

-- venue changes ride the reschedule-proposal consent flow
alter table reschedule_proposals add column new_venue_id uuid references venues(id);
