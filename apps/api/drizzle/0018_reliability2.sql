-- Reliability 2.0 (BM §4.4): host accountability + recognition tables.
ALTER TYPE score_event_type ADD VALUE IF NOT EXISTS 'host_ghost'; -- PG12+: add-only, no usage in same txn
ALTER TYPE score_event_type ADD VALUE IF NOT EXISTS 'reschedule_reject';

CREATE TABLE IF NOT EXISTS apology_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id),
  host_user_id uuid NOT NULL,
  member_id uuid NOT NULL,
  response varchar(10), -- null=pending, 'accept' | 'decline'
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, member_id)
);

CREATE TABLE IF NOT EXISTS reschedule_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id),
  proposed_by uuid NOT NULL,
  new_starts_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL, -- start - 4h
  status varchar(12) NOT NULL DEFAULT 'pending', -- pending|applied|rejected|withdrawn
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS reschedule_one_pending_per_spot
  ON reschedule_proposals (spot_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS reschedule_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES reschedule_proposals(id),
  member_id uuid NOT NULL,
  accepted boolean NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, member_id)
);

CREATE TABLE IF NOT EXISTS handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id),
  from_user_id uuid NOT NULL,
  nominee_id uuid, -- null = broadcast to members
  status varchar(12) NOT NULL DEFAULT 'pending', -- pending|accepted|expired|withdrawn
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS handovers_one_pending_per_spot
  ON handovers (spot_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'open', -- open|granted|denied
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id),
  user_id uuid NOT NULL,
  emoji varchar(16) NOT NULL DEFAULT 'heart',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS message_reactions_user_day_idx ON message_reactions (user_id, created_at);
