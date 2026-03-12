ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS selling_method text, -- 'online', 'local', 'both'
ADD COLUMN IF NOT EXISTS price_tier text, -- 'budget', 'mid', 'premium'
ADD COLUMN IF NOT EXISTS customer_gender text; -- 'male', 'female', 'both'
