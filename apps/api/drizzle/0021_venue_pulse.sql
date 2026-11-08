-- DineFirst study #2: post-event venue pulse (2 taps, aggregate-only public).
create table if not exists venue_pulse (
  spot_id uuid not null references spots(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  enjoyed boolean not null,
  note varchar(80),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);
create index if not exists venue_pulse_venue_idx on venue_pulse (venue_id, created_at);
