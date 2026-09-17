/*
# CogniMetrics Telemetry Engine (CMTE) — Core Schema

1. Purpose
   Stores text telemetry events, stylometry vectors, and system architecture metrics
   for the CMTE dashboard. This is a multi-tenant app where authenticated users each
   own their telemetry data.

2. New Tables
   - `telemetry_events` — individual text telemetry events with source, severity, payload
   - `stylometry_vectors` — vector analysis results for text samples (lexical, syntactic, structural metrics)
   - `system_metrics` — aggregated system architecture metrics (throughput, latency, entropy, energy)
   - `subscription_plans` — Stripe-linked pricing plans for the product

3. Columns

   telemetry_events:
   - id (uuid, PK)
   - user_id (uuid, FK -> auth.users, default auth.uid())
   - source (text) — system component that emitted the event
   - event_type (text) — category of telemetry event
   - severity (text) — info | warning | error | critical
   - message (text) — human-readable event message
   - payload (jsonb) — structured event data
   - created_at (timestamptz, default now())

   stylometry_vectors:
   - id (uuid, PK)
   - user_id (uuid, FK -> auth.users, default auth.uid())
   - sample_label (text) — label for the analyzed text sample
   - lexical_diversity (real) — 0..1 metric
   - syntactic_complexity (real) — 0..1 metric
   - structural_entropy (real) — 0..1 metric
   - readability_score (real) — 0..100
   - sentiment_polarity (real) — -1..1
   - vector_hash (text) — deterministic hash of the vector
   - created_at (timestamptz, default now())

   system_metrics:
   - id (uuid, PK)
   - user_id (uuid, FK -> auth.users, default auth.uid())
   - node_id (text) — identifier of the system node
   - throughput (real) — events/second
   - latency_ms (real) — average latency in milliseconds
   - entropy_bits (real) — Shannon entropy in bits
   - energy_abs (real, default 10.0000) — thermodynamic anchor E_ABS
   - status (text) — healthy | degraded | critical
   - recorded_at (timestamptz, default now())

   subscription_plans:
   - id (uuid, PK)
   - name (text) — plan name
   - price_cents (int) — monthly price in cents
   - stripe_price_id (text) — Stripe price ID (nullable until Stripe configured)
   - features (jsonb) — list of features included
   - sort_order (int) — display order

4. Security
   - RLS enabled on telemetry_events, stylometry_vectors, system_metrics (owner-scoped, authenticated only)
   - RLS enabled on subscription_plans (public read for anon + authenticated, no writes from client)

5. Indexes
   - telemetry_events(user_id, created_at DESC)
   - stylometry_vectors(user_id, created_at DESC)
   - system_metrics(user_id, recorded_at DESC)
*/

-- Telemetry Events
CREATE TABLE IF NOT EXISTS telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_telemetry" ON telemetry_events;
CREATE POLICY "select_own_telemetry" ON telemetry_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_telemetry" ON telemetry_events;
CREATE POLICY "insert_own_telemetry" ON telemetry_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_telemetry" ON telemetry_events;
CREATE POLICY "update_own_telemetry" ON telemetry_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_telemetry" ON telemetry_events;
CREATE POLICY "delete_own_telemetry" ON telemetry_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_created
  ON telemetry_events(user_id, created_at DESC);

-- Stylometry Vectors
CREATE TABLE IF NOT EXISTS stylometry_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_label text NOT NULL,
  lexical_diversity real NOT NULL DEFAULT 0,
  syntactic_complexity real NOT NULL DEFAULT 0,
  structural_entropy real NOT NULL DEFAULT 0,
  readability_score real NOT NULL DEFAULT 0,
  sentiment_polarity real NOT NULL DEFAULT 0,
  vector_hash text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stylometry_vectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stylometry" ON stylometry_vectors;
CREATE POLICY "select_own_stylometry" ON stylometry_vectors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stylometry" ON stylometry_vectors;
CREATE POLICY "insert_own_stylometry" ON stylometry_vectors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_stylometry" ON stylometry_vectors;
CREATE POLICY "update_own_stylometry" ON stylometry_vectors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_stylometry" ON stylometry_vectors;
CREATE POLICY "delete_own_stylometry" ON stylometry_vectors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stylometry_vectors_user_created
  ON stylometry_vectors(user_id, created_at DESC);

-- System Metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  throughput real NOT NULL DEFAULT 0,
  latency_ms real NOT NULL DEFAULT 0,
  entropy_bits real NOT NULL DEFAULT 0,
  energy_abs real NOT NULL DEFAULT 10.0000,
  status text NOT NULL DEFAULT 'healthy',
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_system_metrics" ON system_metrics;
CREATE POLICY "select_own_system_metrics" ON system_metrics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_system_metrics" ON system_metrics;
CREATE POLICY "insert_own_system_metrics" ON system_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_system_metrics" ON system_metrics;
CREATE POLICY "update_own_system_metrics" ON system_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_system_metrics" ON system_metrics;
CREATE POLICY "delete_own_system_metrics" ON system_metrics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_system_metrics_user_recorded
  ON system_metrics(user_id, recorded_at DESC);

-- Subscription Plans (public read, no client writes)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_cents int NOT NULL DEFAULT 0,
  stripe_price_id text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_subscription_plans" ON subscription_plans;
CREATE POLICY "read_subscription_plans" ON subscription_plans FOR SELECT
  TO anon, authenticated USING (true);

-- Seed default plans
INSERT INTO subscription_plans (name, price_cents, features, sort_order) VALUES
  ('Free', 0, '["1,000 events/month","Basic stylometry","7-day retention","Community support"]'::jsonb, 1),
  ('Pro', 2900, '["50,000 events/month","Full stylometry vectors","30-day retention","Priority support","Custom alerts"]'::jsonb, 2),
  ('Enterprise', 9900, '["Unlimited events","Advanced vector analysis","365-day retention","Dedicated support","On-prem connectors","SLA guarantee"]'::jsonb, 3)
ON CONFLICT DO NOTHING;