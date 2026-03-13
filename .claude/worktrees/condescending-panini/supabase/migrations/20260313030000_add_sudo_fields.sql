-- ============================================================================
-- Add Sudo Africa Integration Fields
-- ============================================================================
-- Extends virtual_cards table with Sudo-specific identifiers
-- ============================================================================

-- Add provider-specific ID columns to virtual_cards table
ALTER TABLE virtual_cards
ADD COLUMN IF NOT EXISTS provider_customer_id TEXT,
ADD COLUMN IF NOT EXISTS provider_account_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN virtual_cards.provider_customer_id IS 'Sudo Africa customer ID (or equivalent for other providers)';
COMMENT ON COLUMN virtual_cards.provider_account_id IS 'Sudo Africa USD settlement account ID (or equivalent for other providers)';

-- Update provider column comment to reflect Sudo as primary
COMMENT ON COLUMN virtual_cards.provider IS 'Card provider: "sudo" (primary), "payora" (future), "flutterwave" (future)';
