-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: user_subscriptions table
-- Billing is now user-level, not org-level.
-- One user pays once. Their plan covers ALL their organizations.
-- organizations.subscription_* columns remain as read-only denormalized mirrors
-- that are propagated by the webhook, NOT written by client code.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Create user_subscriptions (single billing record per user) ─────────────

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan state
  subscription_tier           TEXT NOT NULL DEFAULT 'starter'
                                CHECK (subscription_tier IN ('starter', 'growth', 'agency')),
  subscription_status         TEXT NOT NULL DEFAULT 'incomplete'
                                CHECK (subscription_status IN (
                                  'active', 'trialing', 'past_due',
                                  'canceled', 'expired', 'incomplete'
                                )),
  subscription_expires_at     TIMESTAMPTZ,
  subscription_grace_ends_at  TIMESTAMPTZ,
  plan_interval               TEXT DEFAULT 'monthly',

  -- Paystack identifiers
  paystack_customer_code      TEXT,
  paystack_sub_code           TEXT,
  paystack_authorization_code TEXT,

  -- Card fingerprint (display only — never used for raw charges)
  paystack_card_last4         TEXT,
  paystack_card_type          TEXT,
  paystack_card_bank          TEXT,
  paystack_card_expiry        TEXT,

  -- Timestamps
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id) -- One subscription per user
);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "user_subscriptions_select_own"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert/update/delete (webhooks + server actions)
CREATE POLICY "user_subscriptions_service_all"
  ON public.user_subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_subs_user_id
  ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_subs_paystack_sub_code
  ON public.user_subscriptions (paystack_sub_code)
  WHERE paystack_sub_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subs_grace_ends_at
  ON public.user_subscriptions (subscription_grace_ends_at)
  WHERE subscription_grace_ends_at IS NOT NULL;

-- ── 4. plan_definitions: add org limit and spend ceiling columns ──────────────

ALTER TABLE public.plan_definitions
  ADD COLUMN IF NOT EXISTS max_organizations     INTEGER,
  ADD COLUMN IF NOT EXISTS ad_spend_ceiling_kobo BIGINT,
  ADD COLUMN IF NOT EXISTS anomaly_buffer_kobo   BIGINT;

UPDATE public.plan_definitions SET
  max_organizations     = 1,
  ad_spend_ceiling_kobo = 10000000,  -- ₦100,000 in kobo
  anomaly_buffer_kobo   = 2000000    -- ₦20,000 in kobo
WHERE plan_id = 'starter';

UPDATE public.plan_definitions SET
  max_organizations     = 3,
  ad_spend_ceiling_kobo = 30000000,  -- ₦300,000 in kobo
  anomaly_buffer_kobo   = 5000000    -- ₦50,000 in kobo
WHERE plan_id = 'growth';

UPDATE public.plan_definitions SET
  max_organizations     = NULL,      -- unlimited
  ad_spend_ceiling_kobo = NULL,
  anomaly_buffer_kobo   = NULL
WHERE plan_id = 'agency';

-- ── 5. Migrate existing billing data from organizations → user_subscriptions ──
-- For each user who is an owner of at least one org, seed one row using the
-- best (highest) tier they currently hold across their orgs.

INSERT INTO public.user_subscriptions (
  user_id,
  subscription_tier,
  subscription_status,
  subscription_expires_at,
  paystack_customer_code,
  paystack_sub_code
)
SELECT DISTINCT ON (om.user_id)
  om.user_id,
  COALESCE(o.subscription_tier, 'starter'),
  COALESCE(o.subscription_status, 'incomplete'),
  o.subscription_expires_at,
  o.paystack_customer_code,
  o.paystack_sub_code
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
WHERE om.role = 'owner'
ORDER BY om.user_id,
  CASE o.subscription_tier
    WHEN 'agency'  THEN 3
    WHEN 'growth'  THEN 2
    ELSE 1
  END DESC
ON CONFLICT (user_id) DO NOTHING;
