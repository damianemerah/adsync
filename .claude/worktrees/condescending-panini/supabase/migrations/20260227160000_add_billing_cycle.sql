-- Add billing cycle tracking to organizations for cron job renewals
alter table "public"."organizations" add column "billing_cycle_day" integer;
alter table "public"."organizations" add column "last_billing_update_at" timestamp with time zone;

-- Update existing active organizations to have a default billing cycle day (e.g. 1st of month)
update "public"."organizations" 
set "billing_cycle_day" = 1 
where "billing_cycle_day" is null 
  and "subscription_status" in ('active', 'trialing');
