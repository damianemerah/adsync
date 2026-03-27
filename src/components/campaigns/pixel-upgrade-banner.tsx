"use client";

import { useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparks, SystemRestart } from "iconoir-react";
import { upgradeToPixelOptimization } from "@/actions/campaigns";
import { toast } from "sonner";

interface PixelUpgradeBannerProps {
  campaignId: string;
  campaignName: string;
}

/**
 * Shows an upgrade prompt for traffic campaigns when Meta Pixel is configured
 * but the campaign hasn't been upgraded to OUTCOME_SALES optimization yet.
 *
 * Clicking "Upgrade" switches from:
 * - OUTCOME_TRAFFIC + LANDING_PAGE_VIEWS (optimizes for clicks)
 * - OUTCOME_SALES + OFFSITE_CONVERSIONS (optimizes for purchases)
 */
export function PixelUpgradeBanner({
  campaignId,
  campaignName,
}: PixelUpgradeBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  const handleUpgrade = () => {
    startTransition(async () => {
      toast.loading("Upgrading campaign...", { id: "upgrade-pixel" });

      const result = await upgradeToPixelOptimization(campaignId);

      if (result.success) {
        toast.success("Campaign upgraded to sales optimization!", {
          id: "upgrade-pixel",
          description: "Meta will now optimize for purchases instead of clicks.",
        });
        setDismissed(true);
      } else {
        toast.error("Upgrade failed", {
          id: "upgrade-pixel",
          description: result.error || "Please try again later.",
        });
      }
    });
  };

  if (dismissed) return null;

  return (
    <Alert className="border-emerald-200 bg-emerald-50/50">
      <Sparks className="h-4 w-4 text-emerald-600" />
      <AlertTitle className="text-emerald-900 font-bold flex items-center gap-2">
        🎯 Pixel Detected — Upgrade Available!
      </AlertTitle>
      <AlertDescription className="text-emerald-800 mt-2 space-y-3">
        <p className="text-sm">
          Your Meta Pixel is configured! Upgrade <strong>{campaignName}</strong>{" "}
          to optimize for <strong>purchases</strong> instead of just clicks.
          This typically improves conversion rates by 15-30%.
        </p>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleUpgrade}
            disabled={isPending}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <SystemRestart className="w-4 h-4 mr-2 animate-spin" />
                Upgrading...
              </>
            ) : (
              <>
                <Sparks className="w-4 h-4 mr-2" />
                Upgrade to Sales Optimization
              </>
            )}
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            disabled={isPending}
            variant="ghost"
            size="sm"
            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
          >
            Maybe Later
          </Button>
        </div>
        <p className="text-xs text-emerald-600">
          <strong>What changes:</strong> Meta will optimize ad delivery for
          people likely to purchase, not just click. Your Tenzu pixel and CAPI
          integration will train the algorithm.
        </p>
      </AlertDescription>
    </Alert>
  );
}
