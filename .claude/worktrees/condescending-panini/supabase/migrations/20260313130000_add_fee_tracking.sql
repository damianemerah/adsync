-- ============================================================================
-- Add fee tracking columns to ad_budget_transactions
-- Enables profit tracking on ad budget top-ups
-- ============================================================================

-- fee_amount_ngn: the platform fee collected (in kobo)
ALTER TABLE ad_budget_transactions
  ADD COLUMN IF NOT EXISTS fee_amount_ngn INTEGER DEFAULT 0;

-- base_amount_ngn: the amount actually credited to the wallet (in kobo)
ALTER TABLE ad_budget_transactions
  ADD COLUMN IF NOT EXISTS base_amount_ngn INTEGER DEFAULT 0;

COMMENT ON COLUMN ad_budget_transactions.fee_amount_ngn IS 'Platform processing fee collected on this transaction (in kobo). Only set for topup transactions.';
COMMENT ON COLUMN ad_budget_transactions.base_amount_ngn IS 'The portion of payment credited to the wallet (in kobo). total_paid = base_amount_ngn + fee_amount_ngn.';
