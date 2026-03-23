/**
 * Meta API v25.0 Error Recovery Handler
 *
 * Provides intelligent retry logic, user notifications, and recovery strategies
 * for common Meta API errors.
 */

import { MetaAPIError, META_ERROR_CODES, isMetaAPIError } from "@/types/meta-errors";
import { sendNotification } from "@/lib/notifications";

/**
 * Auto-retry configuration for transient errors
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000, // Start with 1 second
  maxDelayMs: 10000, // Cap at 10 seconds
  backoffMultiplier: 2, // Exponential backoff
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Execute a Meta API call with automatic retry logic
 *
 * @param fn - The Meta API function to execute
 * @param context - Context for logging and notifications
 * @returns The result of the API call
 * @throws MetaAPIError if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context?: {
    operation?: string;
    userId?: string;
    organizationId?: string;
  }
): Promise<T> {
  let lastError: MetaAPIError | Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Only retry if it's a retryable Meta error
      if (!isMetaAPIError(error) || !error.isRetryable) {
        throw error;
      }

      console.warn(
        `🔄 Retrying Meta API call (attempt ${attempt}/${RETRY_CONFIG.maxAttempts}) after error:`,
        error.code,
        error.message
      );

      // Don't sleep after the last attempt
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delayMs = getRetryDelay(attempt);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  console.error(
    `❌ All retry attempts exhausted for ${context?.operation || "Meta API call"}`
  );
  throw lastError;
}

/**
 * Handle Meta API error and send appropriate notifications
 *
 * This function analyzes the error and sends user-facing notifications
 * for actionable errors (e.g., expired token, missing payment method).
 *
 * @param error - The error to handle
 * @param context - Context for notifications
 */
export async function handleMetaError(
  error: unknown,
  context: {
    userId?: string;
    organizationId?: string;
    supabase?: any; // Supabase client for DB updates
    adAccountId?: string;
  }
): Promise<void> {
  if (!isMetaAPIError(error)) {
    // Not a Meta error, nothing to handle
    return;
  }

  console.error("🚨 Handling Meta API Error:", error.toDebugInfo());

  const { userId, organizationId, supabase, adAccountId } = context;

  // Send notification for actionable errors
  if (error.actionable && userId && organizationId) {
    try {
      await sendNotification(
        {
          userId,
          organizationId,
          title: error.userTitle || "Meta API Error",
          message: error.userMessage || error.message,
          type: getCriticalityLevel(error.code),
          category: getNotificationCategory(error.code),
          actionUrl: error.actionUrl,
          actionLabel: error.actionLabel,
        },
        supabase
      );
      console.log("✅ Notification sent for error:", error.code);
    } catch (notifyErr) {
      console.error("⚠️ Failed to send notification:", notifyErr);
    }
  }

  // Update ad account health status for critical errors
  if (supabase && adAccountId) {
    await updateAdAccountHealth(supabase, adAccountId, error);
  }
}

/**
 * Update ad account health status based on error
 */
async function updateAdAccountHealth(
  supabase: any,
  adAccountId: string,
  error: MetaAPIError
): Promise<void> {
  let healthStatus: string | null = null;

  switch (error.code) {
    case META_ERROR_CODES.INVALID_ACCESS_TOKEN:
      healthStatus = "disconnected";
      break;
    case META_ERROR_CODES.MISSING_PAYMENT_METHOD:
      healthStatus = "payment_issue";
      break;
    case META_ERROR_CODES.INSUFFICIENT_PERMISSIONS:
      healthStatus = "permission_issue";
      break;
    case META_ERROR_CODES.AD_ACCOUNT_DISABLED:
      healthStatus = "disabled";
      break;
    default:
      // Don't update for non-critical errors
      return;
  }

  if (healthStatus) {
    try {
      await supabase
        .from("ad_accounts")
        .update({ health_status: healthStatus })
        .eq("id", adAccountId);
      console.log(`✅ Updated ad account health status: ${healthStatus}`);
    } catch (updateErr) {
      console.error("⚠️ Failed to update ad account health:", updateErr);
    }
  }
}

/**
 * Get notification criticality level based on error code
 */
function getCriticalityLevel(errorCode: number): "critical" | "warning" | "info" {
  const criticalErrors: number[] = [
    META_ERROR_CODES.INVALID_ACCESS_TOKEN,
    META_ERROR_CODES.MISSING_PAYMENT_METHOD,
    META_ERROR_CODES.AD_ACCOUNT_DISABLED,
  ];

  const warningErrors: number[] = [
    META_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    META_ERROR_CODES.RATE_LIMIT_EXCEEDED,
  ];

  if (criticalErrors.includes(errorCode)) return "critical";
  if (warningErrors.includes(errorCode)) return "warning";
  return "info";
}

/**
 * Get notification category based on error code
 */
function getNotificationCategory(
  errorCode: number
): "campaign" | "budget" | "account" | "system" {
  const accountErrors: number[] = [
    META_ERROR_CODES.INVALID_ACCESS_TOKEN,
    META_ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    META_ERROR_CODES.AD_ACCOUNT_DISABLED,
  ];

  const budgetErrors: number[] = [META_ERROR_CODES.MISSING_PAYMENT_METHOD, META_ERROR_CODES.BUDGET_TOO_LOW];

  if (accountErrors.includes(errorCode)) return "account";
  if (budgetErrors.includes(errorCode)) return "budget";
  return "system";
}

/**
 * Check if an error is safe to retry
 */
export function isRetryable(error: unknown): boolean {
  return isMetaAPIError(error) && error.isRetryable;
}

/**
 * Extract user-facing error display from any error
 */
export function getUserErrorDisplay(error: unknown): {
  title: string;
  message: string;
  code?: number;
  actionable: boolean;
  actionLabel?: string;
  actionUrl?: string;
} {
  if (isMetaAPIError(error)) {
    const display = error.toUserDisplay();
    return {
      title: display.title || "Meta API Error",
      message: display.message || "An error occurred",
      code: display.code,
      actionable: display.actionable,
      actionLabel: display.actionLabel,
      actionUrl: display.actionUrl,
    };
  }

  // Fallback for non-Meta errors
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
  return {
    title: "Error",
    message: errorMessage,
    actionable: false,
  };
}
