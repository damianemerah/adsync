/**
 * Job Status Badge Component
 *
 * Displays the current status of a background job with appropriate styling and icons.
 * Used in campaigns list, admin dashboard, and job monitoring UI.
 *
 * Statuses:
 * - queuing: Job is in the queue, waiting to be processed
 * - processing: Job is currently being executed
 * - completed: Job finished successfully
 * - pending_review: Campaign launched, awaiting Meta approval
 * - active: Campaign is live
 * - failed: Job failed permanently (exhausted retries)
 */

"use client";

import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type CampaignStatus =
  | "draft"
  | "queuing"
  | "processing"
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "failed";

interface JobStatusBadgeProps {
  status: CampaignStatus;
  showIcon?: boolean;
  error?: string | null;
  attempts?: number;
  maxAttempts?: number;
}

export function JobStatusBadge({
  status,
  showIcon = true,
  error,
  attempts,
  maxAttempts,
}: JobStatusBadgeProps) {
  const config: Record<
    CampaignStatus,
    {
      label: string;
      variant:
        | "default"
        | "secondary"
        | "destructive"
        | "outline"
        | "success";
      icon: React.ComponentType<{ className?: string }>;
      animate?: boolean;
      tooltip?: string;
    }
  > = {
    draft: {
      label: "Draft",
      variant: "outline",
      icon: Clock,
      tooltip: "Campaign has not been launched yet",
    },
    queuing: {
      label: "Queuing",
      variant: "secondary",
      icon: Clock,
      tooltip: "Campaign is in the launch queue",
    },
    processing: {
      label: "Launching",
      variant: "default",
      icon: Loader2,
      animate: true,
      tooltip: attempts
        ? `Attempt ${attempts}/${maxAttempts}`
        : "Creating campaign on Meta...",
    },
    pending_review: {
      label: "Under Review",
      variant: "default",
      icon: Eye,
      tooltip: "Meta is reviewing your campaign (usually 24-48 hours)",
    },
    active: {
      label: "Active",
      variant: "success",
      icon: Zap,
      tooltip: "Campaign is live and delivering ads",
    },
    paused: {
      label: "Paused",
      variant: "secondary",
      icon: Clock,
      tooltip: "Campaign is paused",
    },
    completed: {
      label: "Completed",
      variant: "secondary",
      icon: CheckCircle2,
      tooltip: "Campaign has ended",
    },
    failed: {
      label: "Failed",
      variant: "destructive",
      icon: XCircle,
      tooltip: error || "Campaign launch failed",
    },
  };

  const { label, variant, icon: Icon, animate, tooltip } = config[status];

  const badge = (
    <Badge variant={variant} className="gap-1.5 font-medium">
      {showIcon && (
        <Icon className={`h-3.5 w-3.5 ${animate ? "animate-spin" : ""}`} />
      )}
      {label}
    </Badge>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
            {error && (
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {error}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

/**
 * Compact variant for table cells
 */
export function JobStatusDot({ status }: { status: CampaignStatus }) {
  const colors: Record<CampaignStatus, string> = {
    draft: "bg-gray-400",
    queuing: "bg-yellow-400",
    processing: "bg-blue-400 animate-pulse",
    pending_review: "bg-orange-400",
    active: "bg-green-500",
    paused: "bg-gray-400",
    completed: "bg-gray-400",
    failed: "bg-red-500",
  };

  return (
    <div
      className={`h-2 w-2 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
