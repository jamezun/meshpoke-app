-- T8.5: marketing waitlist (public signup, no auth)
CREATE TABLE waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL UNIQUE,
  source varchar(32) NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);
