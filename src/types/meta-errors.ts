/**
 * Meta Marketing API v25.0 Error Types
 *
 * Enhanced error handling with user-friendly messages and structured diagnostics.
 * @see https://developers.facebook.com/docs/marketing-api/insights/error-codes/
 */

// Common Meta API error codes (v25.0)
export const META_ERROR_CODES = {
  // Authentication & Permissions
  INVALID_ACCESS_TOKEN: 190,
  INSUFFICIENT_PERMISSIONS: 200,
  INVALID_OAUTH_TOKEN: 104,

  // Campaign & Ad Set Errors
  INVALID_PARAMETER: 100,
  MISSING_PAYMENT_METHOD: 1359188, // Already handled in campaigns.ts
  BUDGET_TOO_LOW: 100, // Subcode varies

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 80000,
  THROTTLED: 17,

  // API Version
  DEPRECATED_API_VERSION: 2635,

  // Targeting & Delivery
  DATE_RANGE_ISSUE: 3018,
  INVALID_CURSOR: 2642,
  QUERY_PARSING_ERROR: 2500,

  // Account Status
  AD_ACCOUNT_DISABLED: 2635, // Different context than API version
  CAMPAIGN_DISABLED: 100, // Subcode indicates campaign-specific
} as const;

// User-friendly error messages mapped to error codes
export const ERROR_MESSAGE_MAP: Record<number, {
  userTitle: string;
  userMessage: string;
  actionable: boolean;
  actionLabel?: string;
  actionUrl?: string;
}> = {
  [META_ERROR_CODES.INVALID_ACCESS_TOKEN]: {
    userTitle: "Account Connection Expired",
    userMessage: "Your Meta account connection has expired. Please reconnect your ad account to continue.",
    actionable: true,
    actionLabel: "Reconnect Account",
    actionUrl: "/ad-accounts",
  },
  [META_ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
    userTitle: "Permission Denied",
    userMessage: "You don't have permission to access this ad account. Contact the account owner to grant you access.",
    actionable: true,
    actionLabel: "Check Permissions",
    actionUrl: "/ad-accounts",
  },
  [META_ERROR_CODES.MISSING_PAYMENT_METHOD]: {
    userTitle: "Payment Method Required",
    userMessage: "Your Meta Ad Account requires a valid payment method before launching campaigns.",
    actionable: true,
    actionLabel: "Add Payment",
    actionUrl: "/ad-accounts",
  },
  [META_ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
    userTitle: "Too Many Requests",
    userMessage: "You've made too many API requests. Please wait a moment and try again.",
    actionable: false,
  },
  [META_ERROR_CODES.DEPRECATED_API_VERSION]: {
    userTitle: "API Update Required",
    userMessage: "The API version used is outdated. Please contact support.",
    actionable: false,
  },
  [META_ERROR_CODES.INVALID_PARAMETER]: {
    userTitle: "Invalid Campaign Settings",
    userMessage: "One or more campaign settings are invalid. Please check your targeting, budget, and creative settings.",
    actionable: true,
    actionLabel: "Review Settings",
  },
  [META_ERROR_CODES.DATE_RANGE_ISSUE]: {
    userTitle: "Invalid Date Range",
    userMessage: "The date range you selected is invalid or too large. Try a smaller range.",
    actionable: true,
  },
};

/**
 * Structured error class for Meta API v25.0 errors
 * Includes enhanced diagnostic fields introduced in v25.0
 */
export class MetaAPIError extends Error {
  public readonly code: number;
  public readonly subcode?: number;
  public readonly type?: string;
  public readonly userTitle?: string;
  public readonly userMessage?: string;
  public readonly fbtrace_id?: string;
  public readonly isRetryable: boolean;
  public readonly actionable: boolean;
  public readonly actionLabel?: string;
  public readonly actionUrl?: string;

  constructor(params: {
    code: number;
    message: string;
    subcode?: number;
    userTitle?: string;
    userMessage?: string;
    type?: string;
    fbtrace_id?: string;
  }) {
    super(params.message);
    this.name = "MetaAPIError";
    this.code = params.code;
    this.subcode = params.subcode;
    this.type = params.type;
    this.fbtrace_id = params.fbtrace_id;

    // Use v25.0's user-friendly messages if provided, otherwise fall back to our map
    const mappedError = ERROR_MESSAGE_MAP[params.code];
    this.userTitle = params.userTitle || mappedError?.userTitle || "Meta API Error";
    this.userMessage = params.userMessage || mappedError?.userMessage || params.message;
    this.actionable = mappedError?.actionable ?? false;
    this.actionLabel = mappedError?.actionLabel;
    this.actionUrl = mappedError?.actionUrl;

    // Determine if error is retryable
    const retryableCodes: number[] = [
      META_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      META_ERROR_CODES.THROTTLED,
    ];
    this.isRetryable = retryableCodes.includes(params.code);
  }

  /**
   * Get user-facing error display data
   */
  toUserDisplay() {
    return {
      title: this.userTitle,
      message: this.userMessage,
      code: this.code,
      subcode: this.subcode,
      actionable: this.actionable,
      actionLabel: this.actionLabel,
      actionUrl: this.actionUrl,
      traceId: this.fbtrace_id,
    };
  }

  /**
   * Get debug information for logging
   */
  toDebugInfo() {
    return {
      name: this.name,
      code: this.code,
      subcode: this.subcode,
      message: this.message,
      type: this.type,
      userTitle: this.userTitle,
      userMessage: this.userMessage,
      fbtrace_id: this.fbtrace_id,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Campaign-level issues (new in v25.0)
 * Available via /{campaign_id}?fields=issues{...}
 */
export interface CampaignIssue {
  error_code: number;
  error_message: string;
  error_summary: string;
  error_type: "warning" | "error" | "critical";
  level: "campaign" | "ad_set" | "ad";
}

/**
 * Type guard to check if an error is a Meta API error
 */
export function isMetaAPIError(error: unknown): error is MetaAPIError {
  return error instanceof MetaAPIError;
}

/**
 * Extract error details from Meta API response
 */
export function parseMetaError(errorData: any): MetaAPIError {
  return new MetaAPIError({
    code: errorData.code,
    message: errorData.message || "Unknown Meta API error",
    subcode: errorData.error_subcode,
    userTitle: errorData.error_user_title,
    userMessage: errorData.error_user_msg,
    type: errorData.type,
    fbtrace_id: errorData.fbtrace_id,
  });
}
