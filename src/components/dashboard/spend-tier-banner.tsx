"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Xmark, ArrowRight } from "iconoir-react";
import { TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { TIER_CONFIG } from "@/lib/constants";

const DISMISS_KEY = "spend_tier_banner_dismissed";

const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};

function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}k`;
  return `₦${naira.toLocaleString("en-NG")}`;
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function SpendTierBanner() {
  const { data, isLoading } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (isLoading || dismissed) return null;

  const status = data?.org?.status;
  const spendKobo = data?.org?.spendKobo ?? 0;
  const tier = data?.org?.tier ?? "starter";
  const pendingTierUpgradeTo = data?.org?.pendingTierUpgradeTo ?? null;
  const pendingTierUpgradeAfter = data?.org?.pendingTierUpgradeAfter ?? null;

  // Only show for active/trialing users with real spend data
  if (!["trialing", "active"].includes(status ?? "") || spendKobo === 0) return null;

  const ceilingKobo = TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.limits?.adSpendCeilingKobo;

  // State 1: 7-day deferred upgrade scheduled (amber)
  const hasPendingUpgrade = !!pendingTierUpgradeTo && !!pendingTierUpgradeAfter;

  // State 2: approaching ceiling (>80%) with no pending upgrade (blue)
  const approachingCeiling =
    !hasPendingUpgrade &&
    ceilingKobo !== null &&
    ceilingKobo !== undefined &&
    spendKobo >= ceilingKobo * 0.8;

  if (!hasPendingUpgrade && !approachingCeiling) return null;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (hasPendingUpgrade) {
    const daysLeft = daysUntil(pendingTierUpgradeAfter!);
    return (
      <div
        role="alert"
        aria-live="polite"
        className="border-b px-4 py-3 bg-amber-50 border-amber-200/60"
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-600" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium leading-snug text-amber-900">
              <span className="font-bold">Plan upgrade in {daysLeft} day{daysLeft !== 1 ? "s" : ""}.</span>{" "}
              Your Meta ad spend of{" "}
              <span className="font-bold">{formatNaira(spendKobo)}/mo</span>{" "}
              exceeds your {TIER_NAMES[tier]} plan limit. You&apos;ll automatically move to{" "}
              {TIER_NAMES[pendingTierUpgradeTo!]} on day 7.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => router.push("/settings/subscription")}
              className="min-h-11 flex-1 sm:flex-none px-4 text-xs font-bold gap-1.5 border-0 bg-amber-600 hover:bg-amber-700 text-white"
            >
              Update Billing
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={handleDismiss}
              className="min-h-11 w-11 rounded-lg flex items-center justify-center shrink-0 transition-colors text-amber-600/70 hover:text-amber-800 hover:bg-amber-100"
              aria-label="Dismiss spend banner"
            >
              <Xmark className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Approaching ceiling (blue info)
  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b px-4 py-3 bg-blue-50 border-blue-200/60"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-blue-600" strokeWidth={2} />
          </div>
          <p className="text-sm font-medium leading-snug text-blue-900">
            <span className="font-bold">
              You&apos;re spending {formatNaira(spendKobo)}/mo on ads.
            </span>{" "}
            Your {TIER_NAMES[tier]} plan covers up to{" "}
            {ceilingKobo ? formatNaira(ceilingKobo) : "unlimited"} — you&apos;re at{" "}
            {Math.round((spendKobo / (ceilingKobo ?? 1)) * 100)}% of your limit.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/settings/subscription")}
            className="min-h-11 flex-1 sm:flex-none px-4 text-xs font-bold gap-1.5 border-0 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Manage Plan
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={handleDismiss}
            className="min-h-11 w-11 rounded-lg flex items-center justify-center shrink-0 transition-colors text-blue-600/70 hover:text-blue-800 hover:bg-blue-100"
            aria-label="Dismiss spend banner"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
