-- Migrate credits from org-scoped to user-scoped.
-- All orgs owned by a user now share one credit pool on the users table.

-- 1. Add credit columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_credits_quota integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz;

-- 2. Make credit_transactions.organization_id nullable
--    (add_credits for trial/top-up may not have a specific org)
ALTER TABLE credit_transactions
  ALTER COLUMN organization_id DROP NOT NULL;

-- 3. Migrate existing org balances to the org owner's user record
UPDATE users u
SET credits_balance = agg.total
FROM (
  SELECT om.user_id, SUM(o.credits_balance) AS total
  FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
  GROUP BY om.user_id
) agg
WHERE u.id = agg.user_id;

-- 4. Drop old RPCs so we can redefine with new signatures
DROP FUNCTION IF EXISTS deduct_credits(uuid, uuid, integer, text, uuid, text);
DROP FUNCTION IF EXISTS add_credits(uuid, integer, text, uuid);

-- 5. New deduct_credits: p_user_id is primary, p_org_id is audit trail only
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_org_id uuid,
  p_credits integer,
  p_reason text,
  p_reference uuid DEFAULT NULL,
  p_model text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT credits_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_balance < p_credits THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient credits');
  END IF;
  UPDATE users SET credits_balance = credits_balance - p_credits WHERE id = p_user_id;
  INSERT INTO credit_transactions (user_id, organization_id, delta, balance_after, reason, reference_id, model_used)
  VALUES (p_user_id, p_org_id, -p_credits, v_balance - p_credits, p_reason, p_reference, p_model);
  RETURN json_build_object('success', true, 'balance_after', v_balance - p_credits);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. New add_credits: p_user_id is primary, p_org_id is optional audit trail
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_credits integer,
  p_reason text,
  p_reference uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL
) RETURNS json AS $$
BEGIN
  UPDATE users SET credits_balance = credits_balance + p_credits WHERE id = p_user_id;
  INSERT INTO credit_transactions (user_id, organization_id, delta, balance_after, reason, reference_id)
  SELECT p_user_id, p_org_id, p_credits, credits_balance, p_reason, p_reference
  FROM users WHERE id = p_user_id;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
