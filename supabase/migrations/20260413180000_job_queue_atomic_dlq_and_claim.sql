-- ============================================================================
-- Job Queue: Atomic DLQ RPC + Contention-Free Job Claim
-- ============================================================================
-- Bug 3: markJobFailed executed two separate REST round-trips to move a job to
--   the DLQ (INSERT job_dlq, then UPDATE job_queue). A crash between them left
--   jobs stuck in 'processing', and resetStuckJobs would retry them, eventually
--   producing duplicate DLQ rows. Fix: a single PL/pgSQL function wraps both
--   writes in one transaction, plus a UNIQUE constraint on job_dlq.job_id
--   makes any duplicate insert a safe no-op.
--
-- Bug 4: fetchNextJob + markJobProcessing were two separate operations. N
--   concurrent workers all read the same top-of-queue row; N-1 wasted their
--   invocation when the optimistic lock failed. Fix: claim_next_job uses
--   FOR UPDATE SKIP LOCKED so concurrent workers each grab a distinct row
--   atomically, with zero contention.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bug 3: Unique constraint on job_dlq to prevent duplicate entries
-- ----------------------------------------------------------------------------
ALTER TABLE job_dlq
  ADD CONSTRAINT job_dlq_job_id_unique UNIQUE (job_id);

-- ----------------------------------------------------------------------------
-- Bug 3: Atomic RPC — insert to DLQ + mark failed in one transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fail_job_to_dlq(
  p_job_id      UUID,
  p_error_msg   TEXT,
  p_error_stack TEXT,
  p_attempts    INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into DLQ. ON CONFLICT DO NOTHING is safe because the UNIQUE
  -- constraint on job_id guarantees idempotency if called twice.
  INSERT INTO job_dlq (job_id, type, payload, error_message, error_stack, attempts)
  SELECT
    jq.id,
    jq.type,
    jq.payload,
    p_error_msg,
    p_error_stack,
    p_attempts
  FROM job_queue jq
  WHERE jq.id = p_job_id
  ON CONFLICT (job_id) DO NOTHING;

  -- Mark the job as permanently failed in the same transaction.
  UPDATE job_queue
  SET
    status       = 'failed',
    last_error   = p_error_msg,
    attempts     = p_attempts,
    completed_at = NOW()
  WHERE id = p_job_id;
END;
$$;

COMMENT ON FUNCTION public.fail_job_to_dlq IS
  'Atomically moves a job to the DLQ and marks it failed in one transaction. '
  'Called by markJobFailed() when retries are exhausted. Idempotent via UNIQUE constraint.';

-- ----------------------------------------------------------------------------
-- Bug 4: Atomic job claim using FOR UPDATE SKIP LOCKED
-- ----------------------------------------------------------------------------
-- Returns the claimed job row (already transitioned to processing), or an
-- empty result set if no eligible job exists.
-- Workers call: SELECT * FROM claim_next_job('campaign_launch');
CREATE OR REPLACE FUNCTION public.claim_next_job(p_type TEXT)
RETURNS SETOF job_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    SELECT id
    FROM   job_queue
    WHERE  type       = p_type
      AND  status     = 'pending'
      AND  updated_at <= NOW()   -- Respects exponential backoff delay
    ORDER BY updated_at ASC, created_at ASC
    FOR UPDATE SKIP LOCKED       -- Concurrent workers skip rows already locked
    LIMIT 1
  )
  UPDATE job_queue
  SET
    status     = 'processing',
    started_at = NOW()
  FROM claimed
  WHERE job_queue.id = claimed.id
  RETURNING job_queue.*;
$$;

COMMENT ON FUNCTION public.claim_next_job IS
  'Atomically selects the next eligible pending job of the given type and '
  'transitions it to processing. Uses FOR UPDATE SKIP LOCKED so concurrent '
  'workers each grab a distinct row with zero contention.';
