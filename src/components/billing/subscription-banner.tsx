"use client";

import { useState } from "react";
import { Flash, Lock, XmarkCircle } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { cn } from "@/lib/utils";

export type SubscriptionBannerVariant = "expired" | "inactive" | "limit";

interface SubscriptionBannerProps {
  variant?: SubscriptionBannerVariant;
  /** Custom headline. Defaults to variant-specific copy. */
  title?: string;
  /** Custom body text. Defaults to variant-specific copy. */
  description?: string;
  /** Paystack plan to pre-select in the dialog. */
  planId?: "starter" | "growth" | "agency";
  /** Extra class on the wrapper */
  className?: string;
  /** Show a dismiss button — use only if the banner is truly optional */
  dismissible?: boolean;
}

const COPY: Record<
  SubscriptionBannerVariant,
  { title: string; description: string }
> = {
  expired: {
    title: "Your free trial has ended",
    description:
      "Subscribe to keep using AI copy generation, campaign creation, and all Tenzu tools.",
  },
  inactive: {
    title: "Subscription inactive",
    description:
      "Your subscription is no longer active. Renew to unlock all features.",
  },
  limit: {
    title: "You've hit your plan limit",
    description: "Upgrade your plan to keep using this feature this month.",
  },
};

/**
 * SubscriptionBanner — inline, non-blocking paywall nudge.
 *
 * Use this instead of `SubscriptionGate` when you want to show a contextual
 * upsell *inside* a feature (e.g. the AI chat) rather than replacing the
 * entire page. The rest of the UI remains usable around it.
 *
 * @example
 * {isTrialExpired && (
 *   <SubscriptionBanner variant="expired" planId="growth" />
 * )}
 */
export function SubscriptionBanner({
  variant = "expired",
  title,
  description,
  planId = "growth",
  className,
  dismissible = false,
}: SubscriptionBannerProps) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const copy = COPY[variant];
  const heading = title ?? copy.title;
  const body = description ?? copy.description;

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col sm:flex-row items-start sm:items-center gap-4",
          "rounded-lg border border-border bg-card px-5 py-4 shadow-sm",
          className,
        )}
        role="alert"
        aria-live="polite"
      >
        {/* Icon */}
        <div className="shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-subtle-foreground" />
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{heading}</p>
          <p className="text-xs text-subtle-foreground mt-0.5 leading-relaxed">
            {body}
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setPaymentOpen(true)}
            className="h-8 gap-1.5 font-semibold"
          >
            <Flash className="h-3.5 w-3.5 fill-current" />
            Upgrade
          </Button>
        </div>

        {/* Dismiss */}
        {dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss banner"
          >
            <XmarkCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        planId={planId}
      />
    </>
  );
}
