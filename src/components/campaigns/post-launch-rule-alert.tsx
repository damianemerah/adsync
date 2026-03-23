"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  WarningTriangle,
  InfoCircle,
  CheckCircle,
  Rocket,
} from "iconoir-react";
import {
  evaluatePostLaunchRules,
  type CampaignMetrics,
  type TriggeredRule,
} from "@/lib/intelligence/post-launch-rules";
import type { Campaign } from "@/lib/api/campaigns";

interface PostLaunchRuleAlertProps {
  campaign: Campaign;
}

const SUGGESTION_LABELS: Record<string, string> = {
  creative_refresh: "Refresh Creative",
  audience_expand: "Expand Audience",
  budget_scale_up: "Increase Budget",
  pause_review: "Pause & Review",
};

const SUGGESTION_PATHS: Record<string, string> = {
  creative_refresh: "/creations/studio",
  audience_expand: "", // links back to campaign
  budget_scale_up: "", // links back to campaign
  pause_review: "", // links back to campaign
};

export function PostLaunchRuleAlert({ campaign }: PostLaunchRuleAlertProps) {
  const topRule = useMemo<TriggeredRule | null>(() => {
    const summary = campaign.summary;
    if (!summary || campaign.status === "draft") return null;

    const createdAt = new Date(campaign.createdAt);
    const now = new Date();
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const ageDays = ageHours / 24;

    const metrics: CampaignMetrics = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      ageHours,
      ageDays,
      impressions: summary.impressions ?? 0,
      reach: summary.reach ?? 0,
      clicks: summary.clicks ?? 0,
      ctr: summary.ctr ?? 0,
      cpcNgn: summary.cpc ?? 0,
      spendNgn: summary.spend ?? 0,
      conversions: campaign.salesCount ?? 0,
    };

    const triggered = evaluatePostLaunchRules(metrics);
    if (triggered.length === 0) return null;

    // Sort by severity — show the most critical one
    const order: Record<string, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };
    return triggered.sort((a, b) => order[a.severity] - order[b.severity])[0];
  }, [campaign]);

  if (!topRule) return null;

  const Icon =
    topRule.severity === "critical"
      ? WarningTriangle
      : topRule.severity === "warning"
        ? WarningTriangle
        : topRule.severity === "success"
          ? Rocket
          : InfoCircle;

  const variantClass =
    topRule.severity === "critical"
      ? "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600"
      : topRule.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600"
        : topRule.severity === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600"
          : "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600";

  const ctaLabel = SUGGESTION_LABELS[topRule.suggestion] ?? "Take Action";
  const ctaPath =
    SUGGESTION_PATHS[topRule.suggestion] || `/campaigns/${campaign.id}`;

  return (
    <Alert className={`${variantClass} rounded-md`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="font-bold text-sm">
        {topRule.severity === "success"
          ? "🚀 Scaling Opportunity"
          : topRule.severity === "critical"
            ? "⚠️ Action Required"
            : topRule.severity === "warning"
              ? "Campaign Alert"
              : "Campaign Update"}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4 mt-1">
        <span className="text-xs leading-relaxed">{topRule.message}</span>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs font-semibold"
        >
          <Link href={ctaPath}>{ctaLabel}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
