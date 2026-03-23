"use client";

import { AlertCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

/**
 * Meta API v25.0 Error Display Component
 *
 * Displays user-friendly error messages from Meta API with actionable guidance.
 * Supports both v25.0's enhanced error structure and legacy error formats.
 */

export interface MetaErrorDisplayProps {
  error: {
    title: string;
    message: string;
    code?: number;
    subcode?: number;
    actionable?: boolean;
    actionLabel?: string;
    actionUrl?: string;
    traceId?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function MetaErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = "",
}: MetaErrorDisplayProps) {
  // Determine severity based on error code
  const getSeverity = (): "critical" | "warning" | "info" => {
    if (!error.code) return "warning";

    const criticalCodes = [190, 1359188, 2635]; // Token expired, payment missing, API deprecated
    const warningCodes = [200, 100, 80000]; // Permissions, invalid param, rate limit

    if (criticalCodes.includes(error.code)) return "critical";
    if (warningCodes.includes(error.code)) return "warning";
    return "info";
  };

  const severity = getSeverity();

  // Icon based on severity
  const Icon =
    severity === "critical"
      ? XCircle
      : severity === "warning"
        ? AlertTriangle
        : severity === "info"
          ? Info
          : AlertCircle;

  // Color scheme based on severity
  const colorClasses = {
    critical: "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200",
    warning: "border-yellow-600 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
    info: "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  };

  const buttonColorClasses = {
    critical: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
    info: "bg-blue-600 hover:bg-blue-700 text-white",
  };

  return (
    <Alert className={`${colorClasses[severity]} border-2 ${className}`}>
      <Icon className="h-5 w-5" />
      <AlertTitle className="font-semibold text-lg mb-2">{error.title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p className="text-sm leading-relaxed">{error.message}</p>

        {/* Error Code Display */}
        {error.code && (
          <div className="text-xs opacity-75 font-mono">
            Error Code: {error.code}
            {error.subcode && ` (Subcode: ${error.subcode})`}
            {error.traceId && ` • Trace ID: ${error.traceId}`}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Primary Action (from error context) */}
          {error.actionable && error.actionUrl && error.actionLabel && (
            <Button
              asChild
              size="sm"
              className={buttonColorClasses[severity]}
            >
              <Link href={error.actionUrl}>{error.actionLabel}</Link>
            </Button>
          )}

          {/* Retry Action */}
          {onRetry && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="border-current"
            >
              Try Again
            </Button>
          )}

          {/* Dismiss Action */}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              size="sm"
              variant="ghost"
              className="text-current hover:bg-black/10 dark:hover:bg-white/10"
            >
              Dismiss
            </Button>
          )}

          {/* Learn More Link */}
          {error.code && (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-current hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Link
                href={`https://developers.facebook.com/docs/marketing-api/error-reference/#error-code-${error.code}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn More →
              </Link>
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Compact error display for inline errors (e.g., form validation)
 */
export function MetaErrorCompact({
  error,
  className = "",
}: {
  error: { title: string; message: string };
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 text-sm text-red-600 dark:text-red-400 ${className}`}>
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">{error.title}</p>
        <p className="text-xs opacity-90 mt-0.5">{error.message}</p>
      </div>
    </div>
  );
}

/**
 * List of common Meta errors with helpful tips
 * Used in campaign launch flow to prevent common mistakes
 */
export function CommonMetaErrors() {
  const commonErrors = [
    {
      code: 190,
      title: "Access Token Expired",
      solution: "Reconnect your Meta Ad Account from Settings → Ad Accounts.",
    },
    {
      code: 1359188,
      title: "Payment Method Required",
      solution: "Add a payment method to your Meta Ad Account before launching campaigns.",
    },
    {
      code: 100,
      title: "Invalid Parameter",
      solution: "Check your campaign settings, especially targeting, budget, and creative formats.",
    },
    {
      code: 200,
      title: "Permission Denied",
      solution: "Make sure you have ADVERTISE permission on the ad account.",
    },
    {
      code: 80000,
      title: "Rate Limit Exceeded",
      solution: "Too many requests. Wait a moment and try again.",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Common Issues & Solutions</h3>
      <div className="space-y-2">
        {commonErrors.map((err) => (
          <div
            key={err.code}
            className="p-3 border rounded-lg bg-muted/30 text-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium">{err.title}</p>
              <span className="text-xs text-muted-foreground font-mono">#{err.code}</span>
            </div>
            <p className="text-xs text-muted-foreground">{err.solution}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
