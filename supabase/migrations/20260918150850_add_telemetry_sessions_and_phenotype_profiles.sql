/*
# Add telemetry_sessions and phenotype_profiles tables

1. Purpose
   Stores per-session pointer dynamics captured by the client-side telemetry hook,
   and the derived phenotype profile built from those sessions. Both tables are
   owner-scoped to the authenticated user.

2. New Tables

   telemetry_sessions:
   - id               (uuid, PK)
   - user_id          (uuid, FK -> auth.users, default auth.uid())
   - started_at       (timestamptz, default now())
   - ended_at         (timestamptz, nullable — null while session is open)
   - pointer_events   (jsonb) — batched W3C pointer event records
   - kinetic_velocity (real)  — derived scalar: average pointer speed (px/ms)
   - surface_pressure (real)  — average pointer pressure (0..1, stylus/touch)
   - tilt_x           (real)  — average tilt on the X axis (degrees)
   - tilt_y           (real)  — average tilt on the Y axis (degrees)
   - event_count      (int)   — total pointer events captured in session
   - created_at       (timestamptz, default now())

   phenotype_profiles:
   - id              (uuid, PK)
   - user_id         (uuid, FK -> auth.users, default auth.uid())
   - session_id      (uuid, FK -> telemetry_sessions, nullable)
   - velocity_mean   (real)   — mean kinetic velocity across sessions
   - velocity_stddev (real)   — standard deviation of velocity
   - pressure_mean   (real)   — mean surface pressure
   - tilt_x_mean     (real)   — mean tilt X
   - tilt_y_mean     (real)   — mean tilt Y
   - profile_hash    (text)   — deterministic hash of the profile vector
   - computed_at     (timestamptz, default now())

3. Security
   - RLS enabled on both tables, owner-scoped to authenticated users.
   - Separate SELECT / INSERT / UPDATE / DELETE policies per table.

4. Indexes
   - telemetry_sessions(user_id, created_at DESC)
   - phenotype_profiles(user_id, computed_at DESC)
*/

-- telemetry_sessions
CREATE TABLE IF NOT EXISTS telemetry_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  pointer_events   jsonb NOT NULL DEFAULT '[]'::jsonb,
  kinetic_velocity real NOT NULL DEFAULT 0,
  surface_pressure real NOT NULL DEFAULT 0,
  tilt_x           real NOT NULL DEFAULT 0,
  tilt_y           real NOT NULL DEFAULT 0,
  event_count      int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE telemetry_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_telemetry_sessions" ON telemetry_sessions;
CREATE POLICY "select_own_telemetry_sessions" ON telemetry_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_telemetry_sessions" ON telemetry_sessions;
CREATE POLICY "insert_own_telemetry_sessions" ON telemetry_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_telemetry_sessions" ON telemetry_sessions;
CREATE POLICY "update_own_telemetry_sessions" ON telemetry_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_telemetry_sessions" ON telemetry_sessions;
CREATE POLICY "delete_own_telemetry_sessions" ON telemetry_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_user_created
  ON telemetry_sessions(user_id, created_at DESC);

-- phenotype_profiles
CREATE TABLE IF NOT EXISTS phenotype_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES telemetry_sessions(id) ON DELETE SET NULL,
  velocity_mean   real NOT NULL DEFAULT 0,
  velocity_stddev real NOT NULL DEFAULT 0,
  pressure_mean   real NOT NULL DEFAULT 0,
  tilt_x_mean     real NOT NULL DEFAULT 0,
  tilt_y_mean     real NOT NULL DEFAULT 0,
  profile_hash    text NOT NULL DEFAULT '',
  computed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE phenotype_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_phenotype_profiles" ON phenotype_profiles;
CREATE POLICY "select_own_phenotype_profiles" ON phenotype_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_phenotype_profiles" ON phenotype_profiles;
CREATE POLICY "insert_own_phenotype_profiles" ON phenotype_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_phenotype_profiles" ON phenotype_profiles;
CREATE POLICY "update_own_phenotype_profiles" ON phenotype_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_phenotype_profiles" ON phenotype_profiles;
CREATE POLICY "delete_own_phenotype_profiles" ON phenotype_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_phenotype_profiles_user_computed
  ON phenotype_profiles(user_id, computed_at DESC);
