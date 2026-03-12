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

  // Persist dismissal per session
  useEffect(() => {
    const key = `trial_banner_dismissed_${data?.org?.id ?? ""}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
    }
  }, [data?.org?.id]);

  const handleDismiss = () => {
    const key = `trial_banner_dismissed_${data?.org?.id ?? ""}`;
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

  const tierLabel =
    tier.charAt(0).toUpperCase() + tier.slice(1);

  const urgency = daysLeft <= 3 ? "high" : daysLeft <= 7 ? "medium" : "low";

  return (
    <div
      className={cn(
        "border-b px-4 py-2.5",
        urgency === "high"
          ? "bg-red-50 border-red-100"
          : urgency === "medium"
            ? "bg-amber-50 border-amber-100"
            : "bg-primary/5 border-primary/10",
      )}
    >
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
              urgency === "high"
                ? "bg-red-100"
                : urgency === "medium"
                  ? "bg-amber-100"
                  : "bg-primary/10",
            )}
          >
            <Flash
              className={cn(
                "h-3.5 w-3.5 fill-current",
                urgency === "high"
                  ? "text-red-600"
                  : urgency === "medium"
                    ? "text-amber-600"
                    : "text-primary",
              )}
            />
          </div>
          <p
            className={cn(
              "text-sm font-medium",
              urgency === "high"
                ? "text-red-900"
                : urgency === "medium"
                  ? "text-amber-900"
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

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/settings/subscription")}
            className={cn(
              "h-8 text-xs font-bold gap-1",
              urgency === "high"
                ? "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20"
                : urgency === "medium"
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20"
                  : "bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/20",
            )}
          >
            Upgrade Now
            <ArrowRight className="h-3 w-3" />
          </Button>
          <button
            onClick={handleDismiss}
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              urgency === "high"
                ? "text-red-400 hover:text-red-600 hover:bg-red-100"
                : urgency === "medium"
                  ? "text-amber-400 hover:text-amber-600 hover:bg-amber-100"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary/10",
            )}
            aria-label="Dismiss"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
