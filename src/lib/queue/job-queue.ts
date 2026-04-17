/**
 * Job Queue Client Library
 *
 * Provides a clean API for enqueuing background jobs and managing their lifecycle.
 *
 * Usage:
 * ```typescript
 * import { enqueueJob } from "@/lib/queue/job-queue";
 *
 * const jobId = await enqueueJob({
 *   type: "campaign_launch",
 *   payload: { campaignId: "123", config: {...} },
 *   organizationId: orgId,
 *   userId: user.id,
 * });
 * ```
 */

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// ============================================================================
// Types
// ============================================================================

export type JobType =
  | "campaign_launch"
  | "insights_sync"
  | "account_health_check"
  | "notification_send"
  | "meta_resource_cleanup";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  user_id: string | null;
}

export interface EnqueueJobOptions {
  type: JobType;
  payload: Record<string, any>;
  organizationId: string;
  userId?: string;
  maxAttempts?: number;
}

export interface JobMetric {
  job_type: JobType;
  duration_ms: number;
  success: boolean;
  error_code?: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Enqueues a new background job for async processing
 *
 * @param options Job configuration
 * @returns Job ID (UUID)
 * @throws Error if database insert fails
 */
export async function enqueueJob(options: EnqueueJobOptions): Promise<string> {
  // Bug 2 fix: use service_role to bypass RLS (no INSERT policy for anon/user clients)
  const supabase = createAdminClient();

  // Bug 5 fix: reject payloads that would OOM edge function workers (150MB limit)
  const payloadStr = JSON.stringify(options.payload ?? {});
  if (payloadStr.length > 64 * 1024) {
    throw new Error(
      `Job payload too large: ${payloadStr.length} bytes (max 64KB)`,
    );
  }

  const { data, error } = await supabase
    .from("job_queue")
    .insert({
      type: options.type,
      payload: options.payload,
      organization_id: options.organizationId,
      user_id: options.userId ?? null,
      max_attempts: options.maxAttempts ?? 3,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[JobQueue] Failed to enqueue job:", error);
    throw new Error(`Job enqueue failed: ${error.message}`);
  }

  console.log(
    `[JobQueue] Enqueued ${options.type} job ${data.id} for org ${options.organizationId}`,
  );

  return data.id;
}

/**
 * Marks a job as processing (locks it for execution)
 *
 * @deprecated fetchNextJob now calls the claim_next_job RPC which atomically
 * fetches and transitions the job to 'processing' in one query. This function
 * is retained for backward compatibility only.
 *
 * @param supabase Supabase client (edge functions pass this)
 * @param jobId Job UUID
 * @returns True if lock acquired, false if already processing
 */
export async function markJobProcessing(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<boolean> {
  const { data: lockedRows, error } = await supabase
    .from("job_queue")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "pending") // Optimistic lock: only update if still pending
    .select("id");

  if (error) {
    console.error(`[JobQueue] Failed to lock job ${jobId}:`, error);
    return false;
  }

  // If no rows returned, job was already locked by another worker
  return !!lockedRows?.length;
}

/**
 * Marks a job as completed successfully
 */
export async function markJobCompleted(
  supabase: SupabaseClient<Database>,
  jobId: string,
  resultPayload?: Record<string, any>,
): Promise<void> {
  const updates: any = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };

  if (resultPayload) {
    // Merge result into existing payload (preserves input data)
    const { data: job } = await supabase
      .from("job_queue")
      .select("payload")
      .eq("id", jobId)
      .single();

    if (job) {
      updates.payload = {
        ...(job.payload as Record<string, any>),
        result: resultPayload,
      };
    }
  }

  const { error } = await supabase
    .from("job_queue")
    .update(updates)
    .eq("id", jobId);

  if (error) {
    console.error(
      `[JobQueue] Failed to mark job ${jobId} as completed:`,
      error,
    );
  }
}

/**
 * Marks a job as failed and handles retry logic or DLQ placement
 *
 * @param supabase Supabase client
 * @param jobId Job UUID
 * @param errorMessage Short error description
 * @param shouldRetry Whether the error is transient and retryable
 * @param errorStack Full error stack (optional, for DLQ)
 */
export async function markJobFailed(
  supabase: SupabaseClient<Database>,
  jobId: string,
  errorMessage: string,
  shouldRetry: boolean = true,
  errorStack?: string,
): Promise<void> {
  const { data: job, error: fetchErr } = await supabase
    .from("job_queue")
    .select("attempts, max_attempts, type, payload")
    .eq("id", jobId)
    .single();

  if (fetchErr || !job) {
    console.error(
      `[JobQueue] Failed to fetch job ${jobId} for failure handling`,
    );
    return;
  }

  console.log("job🔥", job);

  const currentAttempts = job.attempts ?? 0;
  const maxAttempts = job.max_attempts ?? 3;
  const newAttempts = currentAttempts + 1;
  const exhausted = newAttempts >= maxAttempts;

  if (exhausted || !shouldRetry) {
    console.log(
      `[JobQueue] Job ${jobId} permanently failed after ${newAttempts} attempts, moving to DLQ`,
    );

    // Bug 3 fix: single atomic RPC replaces two separate HTTP round-trips.
    // Inserts into job_dlq AND marks job_queue.status='failed' in one transaction.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dlqError } = await (supabase as any).rpc("fail_job_to_dlq", {
      p_job_id: jobId,
      p_error_msg: errorMessage,
      p_error_stack: errorStack ?? null,
      p_attempts: newAttempts,
    });

    if (dlqError) {
      console.error(
        `[JobQueue] Failed to atomically fail job ${jobId} to DLQ:`,
        dlqError,
      );
    }
  } else {
    // Retry with exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, newAttempts), 300000); // Max 5min
    const retryAt = new Date(Date.now() + backoffMs);

    console.log(
      `[JobQueue] Job ${jobId} will retry in ${Math.round(backoffMs / 1000)}s (attempt ${newAttempts}/${maxAttempts})`,
    );

    await supabase
      .from("job_queue")
      .update({
        status: "pending", // Back to pending for retry
        last_error: errorMessage,
        attempts: newAttempts,
        updated_at: retryAt.toISOString(), // Delay next poll
      })
      .eq("id", jobId);
  }
}

/**
 * Records job execution metrics for monitoring
 */
export async function recordMetric(
  supabase: SupabaseClient<Database>,
  metric: JobMetric,
): Promise<void> {
  const { error } = await supabase.from("job_metrics").insert({
    job_type: metric.job_type,
    duration_ms: metric.duration_ms,
    success: metric.success,
    error_code: metric.error_code ?? null,
  });

  if (error) {
    console.error("[JobQueue] Failed to record metric:", error);
  }
}

/**
 * Atomically claims the next pending job of a specific type.
 *
 * Bug 1+4 fix: replaces the old two-step fetch+lock pattern with a single
 * claim_next_job RPC that uses FOR UPDATE SKIP LOCKED. This means:
 * - Backoff delays are honoured (filters updated_at <= NOW())
 * - Concurrent workers each claim a distinct row with zero contention
 *
 * @param supabase Supabase client
 * @param jobType Type of job to fetch
 * @returns Job object (already in 'processing') or null if none eligible
 */
export async function fetchNextJob(
  supabase: SupabaseClient<Database>,
  jobType: JobType,
): Promise<Job | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("claim_next_job", {
    p_type: jobType,
  });

  if (error) {
    console.error(`[JobQueue] Error claiming ${jobType} job:`, error);
    return null;
  }

  // rpc() returns an array for SETOF functions; take the first (and only) row
  const rows = data as Job[] | null;
  return rows?.[0] ?? null;
}

/**
 * Checks for stuck jobs (processing for too long) and resets them
 *
 * Call this from a monitoring edge function every 15 minutes
 *
 * @param supabase Supabase client
 * @param timeoutMinutes Consider jobs stuck if processing for this long
 * @returns Number of jobs reset
 */
export async function resetStuckJobs(
  supabase: SupabaseClient<Database>,
  timeoutMinutes: number = 15,
): Promise<number> {
  const cutoffTime = new Date(
    Date.now() - timeoutMinutes * 60 * 1000,
  ).toISOString();

  const { data: stuckJobs, error: fetchErr } = await supabase
    .from("job_queue")
    .select("id, type, attempts, max_attempts")
    .eq("status", "processing")
    .lt("started_at", cutoffTime);

  if (fetchErr || !stuckJobs || stuckJobs.length === 0) {
    return 0;
  }

  console.log(`[JobQueue] Found ${stuckJobs.length} stuck jobs, resetting...`);

  let resetCount = 0;

  for (const job of stuckJobs) {
    const currentAttempts = job.attempts ?? 0;
    const maxAttempts = job.max_attempts ?? 3;

    if (currentAttempts >= maxAttempts) {
      // Exceeded retries, move to DLQ
      await markJobFailed(
        supabase,
        job.id,
        `Job stuck in processing for ${timeoutMinutes} minutes (timeout)`,
        false,
      );
    } else {
      // Reset to pending for retry
      await supabase
        .from("job_queue")
        .update({
          status: "pending",
          last_error: `Job timed out after ${timeoutMinutes} minutes`,
          attempts: currentAttempts + 1,
        })
        .eq("id", job.id);

      resetCount++;
    }
  }

  return resetCount;
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Gets job by ID (for status polling in UI)
 */
export async function getJobById(jobId: string): Promise<Job | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_queue")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    return null;
  }

  return data as Job;
}

/**
 * Gets recent jobs for an organization (for admin dashboard)
 */
export async function getOrgJobs(
  organizationId: string,
  limit: number = 50,
): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_queue")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[JobQueue] Error fetching org jobs:", error);
    return [];
  }

  return data as Job[];
}
