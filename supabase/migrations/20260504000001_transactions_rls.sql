-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: transactions_rls
-- Purpose: Add RLS policies to the transactions table so that:
--   • Authenticated org members can read their org's transactions (invoices UI)
--   • Only the service_role can write (webhooks + server actions already use it)
--
-- Root cause: Without a SELECT policy, getInvoices() returned an empty array
-- silently because the regular Supabase client is blocked by default-deny RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS (idempotent — safe to run even if already enabled)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ── READ: org members can see their own org's transactions ────────────────────
CREATE POLICY "transactions_select_by_org_member"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- ── WRITE: only service_role (webhooks + server actions) ─────────────────────
-- Note: No explicit INSERT/UPDATE policy for authenticated is intentional.
-- All writes go through service-role clients (webhooks, server actions).
-- service_role bypasses RLS by default, so no explicit policy is needed.
-- This comment documents the decision to prevent "helpfully" adding write access later.
