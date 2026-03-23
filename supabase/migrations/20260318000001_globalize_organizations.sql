ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS country_code      TEXT NOT NULL DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS currency_default  TEXT NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS timezone          TEXT NOT NULL DEFAULT 'Africa/Lagos',
  ADD COLUMN IF NOT EXISTS billing_provider  TEXT NOT NULL DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS city              TEXT DEFAULT 'Lagos',
  ADD COLUMN IF NOT EXISTS state             TEXT DEFAULT 'Lagos';
