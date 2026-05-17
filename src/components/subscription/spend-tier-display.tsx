"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Flash, Refresh, InfoCircle } from "iconoir-react";
import { type TierId } from "@/lib/constants";
import { resolveSpendTier } from "@/lib/tier-resolver";
import { formatCurrency, formatDate } from "@/lib/utils";
import { syncSpendAndUpdateTier } from "@/actions/spend-sync";
import { toast } from "sonner";

// ─── Spend progress bar ───────────────────────────────────────────────────────

function SpendProgressBar({
  spendKobo,
  ceilingKobo,
}: {
  spendKobo: number;
  ceilingKobo: number | null;
}) {
  if (ceilingKobo === null) {
    // Agency — unlimited
    return (
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full w-full bg-primary rounded-full" />
      </div>
    );
  }

  const percent = Math.min((spendKobo / ceilingKobo) * 100, 100);
  const isNearCeiling = percent >= 80;

  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          isNearCeiling ? "bg-status-warning" : "bg-primary"
        }`}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}



// ─── Main component ───────────────────────────────────────────────────────────

export function SpendTierDisplay() {
  const { data: subscription, refetch } = useSubscription();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);

  const currentTier = (subscription?.org?.tier ?? "starter") as TierId;
  const spendKobo = subscription?.org?.spendKobo ?? 0;
  const spendEvaluatedAt = subscription?.org?.spendEvaluatedAt;
  const spendFloorTier = resolveSpendTier(spendKobo);

  // Ceiling for progress bar
  const tierConfig =
    currentTier === "starter"
      ? { ceiling: 10_000_000 }
      : currentTier === "growth"
        ? { ceiling: 30_000_000 }
        : { ceiling: null };



  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncSpendAndUpdateTier();
      if (result.success) {
        toast.success(
          result.tierChanged
            ? `Plan updated to ${result.resolvedTier} based on your spend.`
            : "Spend data refreshed. Your plan is up to date.",
        );
        refetch();
      } else {
        toast.error(result.error ?? "Sync failed. Please try again.");
      }
    } catch {
      toast.error("Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };



  return (
    <section className="pt-4 border-t border-border mt-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading text-foreground">
            Spend-Based Plan
          </h2>
          <p className="text-sm text-subtle-foreground mt-1 max-w-lg">
            Your plan tier is automatically determined by your Meta ad account&apos;s
            rolling 30-day spend.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 border-border bg-background"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <Refresh className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : "Refresh Spend"}
        </Button>
      </div>

      {/* Spend progress card */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
        {/* Tier indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flash className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground capitalize">
              {currentTier} Plan
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] bg-primary/10 text-primary border-0 gap-1"
            >
              <CheckCircle className="h-2.5 w-2.5" /> Spend-matched
            </Badge>
          </div>
          <span className="text-xs text-subtle-foreground">
            {tierConfig.ceiling !== null
              ? `${formatCurrency(spendKobo / 100)} / ${formatCurrency(tierConfig.ceiling / 100)}`
              : "Unlimited"}
          </span>
        </div>

        {/* Progress bar */}
        <SpendProgressBar
          spendKobo={spendKobo}
          ceilingKobo={tierConfig.ceiling}
        />

        {/* Labels */}
        <div className="flex items-center justify-between text-[11px] text-subtle-foreground">
          <span>
            30-day spend:{" "}
            <span className="text-foreground font-medium">
              {formatCurrency(spendKobo / 100)}
            </span>
          </span>
          <span>
            {tierConfig.ceiling !== null
              ? `Plan ceiling: ${formatCurrency(tierConfig.ceiling / 100)}`
              : "No ceiling (Agency)"}
          </span>
        </div>

        {/* Evaluation timestamp */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-border">
          <Clock className="h-3 w-3 text-subtle-foreground" />
          <span className="text-[11px] text-subtle-foreground">
            {spendEvaluatedAt
              ? `Last evaluated ${formatDate(spendEvaluatedAt)}`
              : "Not yet evaluated — click Refresh Spend to sync."}
          </span>
        </div>
      </div>

    </section>
  );
}
