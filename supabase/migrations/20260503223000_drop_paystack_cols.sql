-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Drop deprecated Paystack and subscription billing columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS paystack_authorization_code,
  DROP COLUMN IF EXISTS paystack_card_last4,
  DROP COLUMN IF EXISTS paystack_card_type,
  DROP COLUMN IF EXISTS paystack_card_bank,
  DROP COLUMN IF EXISTS paystack_card_expiry,
  DROP COLUMN IF EXISTS paystack_customer_code,
  DROP COLUMN IF EXISTS paystack_sub_code,
  DROP COLUMN IF EXISTS subscription_grace_ends_at;
