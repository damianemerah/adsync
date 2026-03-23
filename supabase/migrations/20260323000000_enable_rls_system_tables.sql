-- Enable RLS on system configuration tables
-- These tables contain pricing/plan data and should be protected

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. plan_definitions - Plan tiers and credit quotas
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE plan_definitions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read plan definitions (needed for pricing page)
CREATE POLICY "Allow read for authenticated users"
  ON plan_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify plans (migrations, admin tools)
CREATE POLICY "Service role only for modifications"
  ON plan_definitions
  FOR ALL
  TO service_role
  USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. credit_costs - AI action credit costs
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE credit_costs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read credit costs (needed for pricing transparency)
CREATE POLICY "Allow read for authenticated users"
  ON credit_costs
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify costs
CREATE POLICY "Service role only for modifications"
  ON credit_costs
  FOR ALL
  TO service_role
  USING (true);
