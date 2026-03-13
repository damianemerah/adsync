-- Create payment status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add Paystack columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT,
ADD COLUMN IF NOT EXISTS paystack_sub_code TEXT,
ADD COLUMN IF NOT EXISTS subscription_status payment_status_enum DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS plan_interval TEXT DEFAULT 'monthly';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_org_sub_status ON organizations(subscription_status);
