-- Add flag to track when a DB-tier auto-upgrade needs its Paystack subscription plan updated
alter table user_subscriptions
  add column if not exists pending_paystack_plan_upgrade boolean not null default false;

-- Schedule the spend-sync edge function daily at 01:00 UTC
-- Evaluates last-30d Meta ad spend for all active users and auto-upgrades tiers
select cron.schedule(
  'spend-sync',
  '0 1 * * *',
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/spend-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);
