"use client";

import { useRouter } from "next/navigation";
import { WarningTriangle, ArrowRight } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

export function GracePeriodBanner() {
  const { data, isLoading } = useSubscription();
  const router = useRouter();

  if (isLoading) return null;

  const status = data?.org?.status;
  const graceEndsAt = data?.org?.graceEndsAt;
  const isInGracePeriod = data?.org?.isInGracePeriod;

  // Only show if the subscription is past_due and still in grace period
  if (status !== "past_due" || !isInGracePeriod || !graceEndsAt) return null;

  const now = new Date();
  const msLeft = graceEndsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  // If there are 0 days left or less, they are basically locked out and shouldn't see the banner anymore
  if (daysLeft <= 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b px-4 py-3 bg-status-danger-soft border-status-danger/15"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — icon + message */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-status-danger/15">
            <WarningTriangle className="h-4 w-4 fill-current text-status-danger" />
          </div>
          <p className="text-sm font-medium leading-snug text-status-danger">
            <span className="font-bold">Payment Failed:</span> We couldn't process your recent subscription payment. 
            You have <span className="font-bold">{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span> to update your billing details before your campaigns are paused and access is restricted.
          </p>
        </div>

        {/* Right — CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => router.push("/settings/subscription")}
            className="min-h-11 flex-1 sm:flex-none px-4 text-xs font-bold gap-1.5"
          >
            Update Payment Method
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
