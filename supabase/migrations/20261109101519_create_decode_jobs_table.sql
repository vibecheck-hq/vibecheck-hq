CREATE TABLE IF NOT EXISTS decode_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'unlocked')),
  decode_result jsonb,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decode_jobs_stripe_session_id ON decode_jobs(stripe_session_id);

ALTER TABLE decode_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON decode_jobs TO service_role;
