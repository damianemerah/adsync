-- ============================================================================
-- FX Rate Management System
-- ============================================================================
-- Stores real-time USD→NGN exchange rates fetched from ExchangeRate-API.com
-- Updated daily via edge function cron job
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. FX Rates Table (Historical audit trail + current active rate)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fx_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_ngn_per_usd    DECIMAL(10, 4) NOT NULL,  -- e.g. 1377.2100
  source_provider     TEXT NOT NULL DEFAULT 'exchangerate-api',  -- 'exchangerate-api' | 'manual' | 'cbn'
  is_active           BOOLEAN NOT NULL DEFAULT false,  -- Only ONE row should be active at a time
  fetched_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups of current active rate
CREATE UNIQUE INDEX idx_fx_rates_active ON fx_rates(is_active) WHERE is_active = true;
CREATE INDEX idx_fx_rates_fetched_at ON fx_rates(fetched_at DESC);

COMMENT ON TABLE fx_rates IS 'Real-time USD→NGN exchange rates. Only one row is active at a time.';
COMMENT ON COLUMN fx_rates.is_active IS 'TRUE for current rate. Edge function sets previous rate to FALSE before inserting new one.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Helper Function: Get Current Active FX Rate
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_current_fx_rate()
RETURNS DECIMAL(10, 4)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- Can be cached within a transaction
AS $$
DECLARE
  v_rate DECIMAL(10, 4);
BEGIN
  SELECT rate_ngn_per_usd INTO v_rate
  FROM fx_rates
  WHERE is_active = true
  LIMIT 1;

  -- Fallback to 1,600 if no active rate found (safety net)
  RETURN COALESCE(v_rate, 1600.0000);
END;
$$;

COMMENT ON FUNCTION get_current_fx_rate IS 'Returns the current active USD→NGN exchange rate. Fallback: 1,600 if no active rate exists.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Helper Function: Update FX Rate (Called by edge function)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_fx_rate(
  p_rate DECIMAL(10, 4),
  p_source TEXT DEFAULT 'exchangerate-api'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Mark all existing rates as inactive
  UPDATE fx_rates SET is_active = false WHERE is_active = true;

  -- Insert new active rate
  INSERT INTO fx_rates (rate_ngn_per_usd, source_provider, is_active, fetched_at)
  VALUES (p_rate, p_source, true, NOW())
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION update_fx_rate IS 'Atomically deactivates old rate and inserts new active rate. Returns new rate ID.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Seed Data: Insert current market rate (as of March 25, 2026)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO fx_rates (rate_ngn_per_usd, source_provider, is_active, fetched_at)
VALUES (1377.2100, 'manual', true, NOW())
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Update ad_budget_transactions to reference fx_rate_id (optional audit)
-- ─────────────────────────────────────────────────────────────────────────
-- Add optional FK to track which rate was used for each transaction
ALTER TABLE ad_budget_transactions
ADD COLUMN IF NOT EXISTS fx_rate_id UUID REFERENCES fx_rates(id);

CREATE INDEX IF NOT EXISTS idx_ad_budget_txns_fx_rate ON ad_budget_transactions(fx_rate_id);

COMMENT ON COLUMN ad_budget_transactions.fx_rate_id IS 'References the fx_rates row used for this transaction (for audit trail).';
