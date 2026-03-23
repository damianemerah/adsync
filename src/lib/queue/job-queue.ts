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

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

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
 * @param supabase Supabase client (edge functions pass this)
 * @param jobId Job UUID
 * @returns True if lock acquired, false if already processing
 */
export async function markJobProcessing(
  supabase: SupabaseClient<Database>,
  jobId: string,
): Promise<boolean> {
  const { error, count } = await supabase
    .from("job_queue")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "pending"); // Optimistic lock: only update if still pending

  if (error) {
    console.error(`[JobQueue] Failed to lock job ${jobId}:`, error);
    return false;
  }

  // If count is 0, job was already locked by another worker
  return count !== 0;
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

    // Move to Dead Letter Queue
    await supabase.from("job_dlq").insert({
      job_id: jobId,
      type: job.type,
      payload: job.payload,
      error_message: errorMessage,
      error_stack: errorStack ?? null,
      attempts: newAttempts,
    });

    // Mark as failed (no more retries)
    await supabase
      .from("job_queue")
      .update({
        status: "failed",
        last_error: errorMessage,
        attempts: newAttempts,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
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
 * Fetches next pending job of a specific type (FIFO)
 *
 * @param supabase Supabase client
 * @param jobType Type of job to fetch
 * @returns Job object or null if none pending
 */
export async function fetchNextJob(
  supabase: SupabaseClient<Database>,
  jobType: JobType,
): Promise<Job | null> {
  const { data, error } = await supabase
    .from("job_queue")
    .select("*")
    .eq("type", jobType)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned (queue is empty)
      return null;
    }
    console.error(`[JobQueue] Error fetching ${jobType} job:`, error);
    return null;
  }

  return data as Job;
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
