-- ─── Migration: Fix health_status enum and campaigns.objective enum ───────────
-- Date: 2026-03-22
-- Fixes:
--   1. Add 'paused_by_system' to ad_accounts.health_status CHECK constraint
--      (account-health edge fn was failing silently when trying to auto-pause)
--   2. Add 'sales', 'leads', 'app_promotion' to campaigns.objective CHECK constraint
--      (these objectives are used in code but were missing from DB constraint)

-- ── 1. ad_accounts.health_status ──────────────────────────────────────────────

ALTER TABLE public.ad_accounts
  DROP CONSTRAINT IF EXISTS ad_accounts_health_status_check;

ALTER TABLE public.ad_accounts
  ADD CONSTRAINT ad_accounts_health_status_check
    CHECK (health_status = ANY (ARRAY[
      'healthy'::text,
      'payment_issue'::text,
      'token_expired'::text,
      'disabled'::text,
      'paused_by_system'::text
    ]));

-- ── 2. campaigns.objective ────────────────────────────────────────────────────

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_objective_check;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_objective_check
    CHECK (objective = ANY (ARRAY[
      'whatsapp'::text,
      'traffic'::text,
      'awareness'::text,
      'engagement'::text,
      'video_views'::text,
      'messages'::text,
      'sales'::text,
      'leads'::text,
      'app_promotion'::text
    ]));
