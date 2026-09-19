/*
# Create user_subscriptions table for Stripe webhook

1. Purpose
   Tracks each user's Stripe subscription state. The stripe-webhook edge function
   writes here when Stripe sends checkout.session.completed, customer.subscription.created,
   customer.subscription.updated, and customer.subscription.deleted events. The frontend
   reads this table to know which plan the current user is on and whether their subscription
   is active.

2. New Table
   user_subscriptions:
   - id                (uuid, PK)
   - user_id           (uuid, FK -> auth.users, default auth.uid(), unique)
   - stripe_customer_id     (text) — Stripe customer object ID
   - stripe_subscription_id (text, unique) — Stripe subscription object ID
   - stripe_price_id        (text) — Stripe price ID the user subscribed to
   - status                  (text) — active | trialing | past_due | canceled | incomplete
   - current_period_end      (timestamptz) — when the current billing period ends
   - cancel_at_period_end    (boolean, default false) — whether the subscription will cancel at period end
   - created_at              (timestamptz, default now())
   - updated_at              (timestamptz, default now())

3. Security
   - RLS enabled, owner-scoped to authenticated users (4 policies: SELECT/INSERT/UPDATE/DELETE).
   - The stripe-webhook edge function uses the service-role key (bypasses RLS) to write rows.
   - The frontend only needs SELECT (read own subscription). INSERT/UPDATE/DELETE policies
     exist for completeness but the client never writes directly — all mutations come from
     the webhook via the service role.

4. Indexes
   - user_subscriptions(user_id) — unique index, one subscription row per user
   - user_subscriptions(stripe_subscription_id) — unique index for webhook lookups
*/

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     text NOT NULL DEFAULT '',
  stripe_subscription_id text UNIQUE NOT NULL DEFAULT '',
  stripe_price_id        text NOT NULL DEFAULT '',
  status                 text NOT NULL DEFAULT 'incomplete',
  current_period_end     timestamptz,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON user_subscriptions;
CREATE POLICY "select_own_subscription" ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON user_subscriptions;
CREATE POLICY "insert_own_subscription" ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscription" ON user_subscriptions;
CREATE POLICY "update_own_subscription" ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscription" ON user_subscriptions;
CREATE POLICY "delete_own_subscription" ON user_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_sub
  ON user_subscriptions(stripe_subscription_id);