-- ============================================================================
-- Job Queue: Fix Backoff Trigger + Index + INSERT RLS Policy
-- ============================================================================
-- Bug 1A: The update_job_queue_timestamp() trigger unconditionally overwrites
--   updated_at = NOW() on every UPDATE, silently destroying the future timestamp
--   that markJobFailed sets for exponential backoff delay. Fix: only auto-set
--   updated_at when the application did not explicitly change it.
--
-- Bug 1B: The idx_job_queue_status_pending index covered (status, created_at)
--   but fetchNextJob / claim_next_job filter on updated_at <= NOW(). Rebuild
--   the index to include (type, updated_at ASC) so the backoff filter is fast.
--
-- Bug 2 (defense-in-depth): job_queue had an INSERT GRANT for authenticated
--   users but no INSERT RLS policy. enqueueJob is being switched to the service
--   role, but add the policy so any future user-client caller doesn't silently
--   fail with an RLS violation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bug 1A: Fix trigger to respect explicitly-set updated_at values
-- ----------------------------------------------------------------------------
-- Before: NEW.updated_at = NOW() always
-- After:  only auto-update when the value wasn't explicitly changed
CREATE OR REPLACE FUNCTION update_job_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- If the application didn't explicitly set updated_at (value is unchanged),
  -- auto-set it to NOW(). If the application set a future timestamp for backoff
  -- delay, leave it alone.
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Bug 1B: Rebuild pending-jobs index to support updated_at-based filtering
-- ----------------------------------------------------------------------------
-- The old index was on (status, created_at) WHERE status='pending'.
-- claim_next_job filters AND updated_at <= NOW() and orders by updated_at ASC,
-- so the index must include updated_at to be useful.
DROP INDEX IF EXISTS idx_job_queue_status_pending;

CREATE INDEX idx_job_queue_status_pending
  ON job_queue (type, updated_at ASC)
  WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- Bug 2: INSERT RLS policy for authenticated users (defense-in-depth)
-- ----------------------------------------------------------------------------
-- enqueueJob uses createAdminClient() (service_role) which bypasses RLS, so
-- this policy is not required for the primary enqueue path. It is added so
-- that any future caller using a user-scoped client does not silently fail.
CREATE POLICY "Org members can insert jobs"
  ON job_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
