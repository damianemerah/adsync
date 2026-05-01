"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Flash, Xmark, ArrowRight } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { data, isLoading } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Persist dismissal per session — keyed by tier so it resets on upgrade
  useEffect(() => {
    const key = `trial_banner_dismissed_${data?.org?.tier ?? ""}_${data?.org?.status ?? ""}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [data?.org?.tier, data?.org?.status]);

  const handleDismiss = () => {
    const key = `trial_banner_dismissed_${data?.org?.tier ?? ""}_${data?.org?.status ?? ""}`;
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  if (isLoading || dismissed) return null;

  const status = data?.org?.status;
  const tier = data?.org?.tier ?? "growth";
  const expiresAt = data?.org?.expiresAt;

  if (status !== "trialing" || !expiresAt) return null;

  const now = new Date();
  const msLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (daysLeft <= 0) return null;

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const urgency = daysLeft <= 2 ? "high" : daysLeft <= 4 ? "medium" : "low";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "border-b px-4 py-3",
        urgency === "high"
          ? "bg-status-danger-soft border-status-danger/15"
          : urgency === "medium"
            ? "bg-status-warning-soft border-status-warning/20"
            : "bg-primary/5 border-primary/10",
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — icon + message */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
              urgency === "high"
                ? "bg-status-danger/15"
                : urgency === "medium"
                  ? "bg-status-warning/20"
                  : "bg-primary/10",
            )}
          >
            <Flash
              className={cn(
                "h-4 w-4 fill-current",
                urgency === "high"
                  ? "text-status-danger"
                  : urgency === "medium"
                    ? "text-status-warning"
                    : "text-primary",
              )}
            />
          </div>
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              urgency === "high"
                ? "text-status-danger"
                : urgency === "medium"
                  ? "text-status-warning"
                  : "text-foreground",
            )}
          >
            <span className="font-bold">
              {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
            </span>{" "}
            on your {tierLabel} trial —{" "}
            {urgency === "high"
              ? "subscribe today to keep access."
              : "subscribe before your trial ends."}
          </p>
        </div>

        {/* Right — CTA row */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant={urgency === "high" ? "destructive" : "default"}
            onClick={() => router.push("/settings/subscription")}
            className="min-h-11 flex-1 sm:flex-none px-4 text-xs font-bold gap-1.5"
          >
            Upgrade Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={handleDismiss}
            className="min-h-11 w-11 rounded-lg flex items-center justify-center shrink-0 text-subtle-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss trial banner"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
