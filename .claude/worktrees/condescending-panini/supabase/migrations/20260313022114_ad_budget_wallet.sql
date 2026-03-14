-- ============================================================================
-- PHASE 2A: Naira Ad Budget Wallet System
-- ============================================================================
-- Enables SMEs to pay in Naira for Meta ad spend via Paystack
-- Virtual USD cards are provisioned per-organization via Payora.app
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Ad Budget Wallet (Naira balance per organization)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_budget_wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  balance_ngn     INTEGER NOT NULL DEFAULT 0,   -- in kobo (NGN x 100)
  reserved_ngn    INTEGER NOT NULL DEFAULT 0,   -- funds reserved for active campaigns
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only view/edit their own org's wallet
ALTER TABLE ad_budget_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's ad budget wallet"
  ON ad_budget_wallets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Virtual Cards Registry (Payora-issued USD cards)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS virtual_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'payora',  -- 'payora' | 'grey' | 'geegpay'
  provider_card_id TEXT NOT NULL,                  -- Payora's external card ID
  card_number_encrypted TEXT,                      -- Encrypted full card number
  last_four       TEXT,                            -- Last 4 digits for display
  expiry_month    TEXT,
  expiry_year     TEXT,
  cvv_encrypted   TEXT,                            -- Encrypted CVV
  status          TEXT DEFAULT 'active',           -- 'active' | 'frozen' | 'terminated'
  meta_account_id TEXT,                            -- Meta ad account it's linked to
  balance_usd     DECIMAL(10, 2) DEFAULT 0.00,     -- Current USD balance on card
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_cards_org ON virtual_cards(organization_id);
CREATE INDEX idx_virtual_cards_status ON virtual_cards(status);

-- RLS: Users can only view their org's virtual card
ALTER TABLE virtual_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's virtual card"
  ON virtual_cards FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Ad Budget Transactions (Audit trail for all wallet movements)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_budget_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,    -- 'topup' | 'card_load' | 'spend' | 'refund' | 'reserve' | 'release'
  amount_ngn      INTEGER NOT NULL, -- in kobo; positive = credit, negative = debit
  amount_usd      DECIMAL(10, 2),   -- USD equivalent (for card_load transactions)
  fx_rate         DECIMAL(10, 4),   -- NGN/USD exchange rate at time of transaction
  balance_after   INTEGER NOT NULL, -- balance_ngn after this transaction
  reference       TEXT,             -- Paystack reference, Payora transaction ID, or Meta charge ID
  description     TEXT,
  metadata        JSONB,            -- Additional context (campaign_id, card_id, etc.)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ad_budget_txns_org ON ad_budget_transactions(organization_id);
CREATE INDEX idx_ad_budget_txns_type ON ad_budget_transactions(type);
CREATE INDEX idx_ad_budget_txns_reference ON ad_budget_transactions(reference);
CREATE INDEX idx_ad_budget_txns_created_at ON ad_budget_transactions(created_at DESC);

-- Unique constraint to prevent duplicate Paystack charges
CREATE UNIQUE INDEX idx_ad_budget_txns_unique_reference
  ON ad_budget_transactions(reference)
  WHERE reference IS NOT NULL AND type = 'topup';

-- RLS: Users can view their org's transactions
ALTER TABLE ad_budget_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's ad budget transactions"
  ON ad_budget_transactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Helper Function: Get current wallet balance
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ad_budget_balance(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance_ngn INTO v_balance
  FROM ad_budget_wallets
  WHERE organization_id = p_org_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Helper Function: Reserve funds for a campaign
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reserve_ad_budget(
  p_org_id UUID,
  p_amount_ngn INTEGER,
  p_campaign_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_current_reserved INTEGER;
BEGIN
  -- Get current wallet state
  SELECT balance_ngn, reserved_ngn
  INTO v_current_balance, v_current_reserved
  FROM ad_budget_wallets
  WHERE organization_id = p_org_id
  FOR UPDATE;  -- Lock row

  -- Check if sufficient unreserved balance
  IF (v_current_balance - v_current_reserved) < p_amount_ngn THEN
    RETURN FALSE;
  END IF;

  -- Increase reserved amount
  UPDATE ad_budget_wallets
  SET
    reserved_ngn = reserved_ngn + p_amount_ngn,
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  -- Record reservation transaction
  INSERT INTO ad_budget_transactions (
    organization_id,
    type,
    amount_ngn,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_org_id,
    'reserve',
    -p_amount_ngn,  -- Negative = debit from available
    v_current_balance - v_current_reserved - p_amount_ngn,
    'Reserved for campaign launch',
    jsonb_build_object('campaign_id', p_campaign_id)
  );

  RETURN TRUE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Comments for documentation
-- ─────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE ad_budget_wallets IS 'Naira wallet for ad spend top-ups. Each org has ONE wallet.';
COMMENT ON TABLE virtual_cards IS 'Payora-issued virtual USD cards. Each org has ONE card linked to their Meta account.';
COMMENT ON TABLE ad_budget_transactions IS 'Immutable audit log of all wallet movements (topups, loads, spends).';
COMMENT ON FUNCTION reserve_ad_budget IS 'Atomically reserve funds for a campaign launch. Returns FALSE if insufficient balance.';
