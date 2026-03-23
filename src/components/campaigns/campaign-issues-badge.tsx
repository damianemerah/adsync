"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CampaignIssue {
  error_code: number;
  error_message: string;
  error_summary: string;
  error_type: "warning" | "error" | "critical";
  level: "campaign" | "ad_set" | "ad";
}

interface CampaignIssuesBadgeProps {
  issues: CampaignIssue[] | null;
  compact?: boolean;
}

export function CampaignIssuesBadge({
  issues,
  compact = false,
}: CampaignIssuesBadgeProps) {
  if (!issues || issues.length === 0) return null;

  const criticalCount = issues.filter((i) => i.error_type === "critical").length;
  const errorCount = issues.filter((i) => i.error_type === "error").length;
  const warningCount = issues.filter((i) => i.error_type === "warning").length;

  // Determine the highest severity issue
  let variant: "destructive" | "warning" | "secondary" = "secondary";
  let icon = <Info className="h-3 w-3" />;
  let label = "";

  if (criticalCount > 0) {
    variant = "destructive";
    icon = <AlertCircle className="h-3 w-3" />;
    label = compact
      ? `${criticalCount}`
      : `${criticalCount} Critical Issue${criticalCount > 1 ? "s" : ""}`;
  } else if (errorCount > 0) {
    variant = "destructive";
    icon = <AlertTriangle className="h-3 w-3" />;
    label = compact
      ? `${errorCount}`
      : `${errorCount} Error${errorCount > 1 ? "s" : ""}`;
  } else if (warningCount > 0) {
    variant = "warning";
    icon = <AlertTriangle className="h-3 w-3" />;
    label = compact
      ? `${warningCount}`
      : `${warningCount} Warning${warningCount > 1 ? "s" : ""}`;
  }

  const tooltipContent = (
    <div className="max-w-xs space-y-2">
      {issues.slice(0, 3).map((issue, idx) => (
        <div key={idx} className="text-xs">
          <div className="font-semibold">{issue.error_summary}</div>
          {issue.error_code && (
            <div className="text-muted-foreground">Code: {issue.error_code}</div>
          )}
        </div>
      ))}
      {issues.length > 3 && (
        <div className="text-xs text-muted-foreground">
          +{issues.length - 3} more issue{issues.length - 3 > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 cursor-help">
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
