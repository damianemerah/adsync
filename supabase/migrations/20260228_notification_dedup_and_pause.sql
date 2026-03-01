-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add dedup_key to notifications
--    This lets us enforce "fire once per window" at the DB level.
--    The key encodes: rule + campaign + window (e.g. "low_ctr:camp123:2026-W09")
-- ─────────────────────────────────────────────────────────────────────────────
alter table notifications
  add column if not exists dedup_key text;

-- Partial unique index: only one notification per (user_id, dedup_key) pair
-- NULL dedup_keys are excluded so normal notifications are never blocked.
create unique index if not exists notifications_dedup_key_user_idx
  on notifications (user_id, dedup_key)
  where dedup_key is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Track auto-pause state on ad_accounts
--    paused_by_system  → we paused it due to low balance
--    auto_paused_at    → when we paused it
-- ─────────────────────────────────────────────────────────────────────────────
alter table ad_accounts
  add column if not exists paused_by_system  boolean default false,
  add column if not exists auto_paused_at    timestamptz;
