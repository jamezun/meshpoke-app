-- T14.2: push dispatch queue (FCM-ready; dispatcher drains status='pending' and send_at <= now())
CREATE TABLE IF NOT EXISTS push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token varchar(255) NOT NULL,
  platform varchar(10) NOT NULL,
  category varchar(20) NOT NULL,
  type varchar(40) NOT NULL,
  payload jsonb,
  send_at timestamptz NOT NULL DEFAULT now(),
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_outbox_ready_idx ON push_outbox (status, send_at);
