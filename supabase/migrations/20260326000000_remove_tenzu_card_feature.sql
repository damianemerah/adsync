-- ============================================================================
-- Remove Tenzu Card / Ad Budget Wallet Feature
-- ============================================================================
-- Date: 2026-03-26
-- Reason: Facebook now supports NGN bank transfers for Nigerian advertisers.
--         The virtual card system is no longer needed.
-- ============================================================================

-- Drop helper functions first
DROP FUNCTION IF EXISTS reserve_ad_budget(UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS get_ad_budget_balance(UUID);

-- Drop tables (cascade to remove all dependent objects)
DROP TABLE IF EXISTS ad_budget_transactions CASCADE;
DROP TABLE IF EXISTS virtual_cards CASCADE;
DROP TABLE IF EXISTS ad_budget_wallets CASCADE;

-- Clean up any leftover indexes (should be auto-dropped by CASCADE, but being explicit)
DROP INDEX IF EXISTS idx_ad_budget_txns_org;
DROP INDEX IF EXISTS idx_ad_budget_txns_type;
DROP INDEX IF EXISTS idx_ad_budget_txns_reference;
DROP INDEX IF EXISTS idx_ad_budget_txns_created_at;
DROP INDEX IF EXISTS idx_ad_budget_txns_unique_reference;
DROP INDEX IF EXISTS idx_virtual_cards_org;
DROP INDEX IF EXISTS idx_virtual_cards_status;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The following have been removed:
--   • ad_budget_wallets table (Naira wallet balances)
--   • virtual_cards table (Sudo Africa USD cards)
--   • ad_budget_transactions table (transaction audit log)
--   • get_ad_budget_balance() function
--   • reserve_ad_budget() function
--
-- Next steps:
--   1. Remove backend code (src/lib/sudo.ts, src/actions/ad-budget.ts)
--   2. Remove frontend components (src/components/billing/ad-budget-topup.tsx)
--   3. Update UI to remove "Ad Budget" tab
-- ============================================================================
