-- Enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Schedule Edge Function crons via pg_net.
-- SUPABASE_URL is hardcoded (not sensitive — it's the public project ref URL).
-- SUPABASE_SERVICE_ROLE_KEY is read from Supabase Vault.
-- Before applying this migration, store the key once in Vault:
--   select vault.create_secret('<your-service-role-key>', 'service_role_key');

-- 1. Sync Campaign Insights (Every 6 Hours)
select cron.schedule(
  'sync-campaign-insights',
  '0 */6 * * *',
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/sync-campaign-insights',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);

-- 2. Subscription Lifecycle (Daily at 22:00 UTC)
select cron.schedule(
  'subscription-lifecycle',
  '0 22 * * *',
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/subscription-lifecycle',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);

-- 3. Account Health (Every 4 Hours)
select cron.schedule(
  'account-health',
  '0 */4 * * *',
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/account-health',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);

-- 4. Post Launch Rules (Every 12 Hours)
select cron.schedule(
  'post-launch-rules',
  '0 */12 * * *',
  $$ select net.http_post(
      url := 'https://iomvjxlfxeppizkhehcl.supabase.co/functions/v1/post-launch-rules',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1
        ),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) $$
);
