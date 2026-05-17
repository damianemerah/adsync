"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Flash,
  ArrowRight,
  Check,
  Shield,
  Xmark,
  Clock,
  CreditCard,
  WarningCircle,
  SystemRestart,
  Settings,
} from "iconoir-react";
import { useSubscription } from "@/hooks/use-subscription";
import {
  getPaymentContext,
  initializePaystackTransaction,
} from "@/actions/paystack";
import { toast } from "sonner";
import {
  PLAN_PRICES,
  PLAN_CREDITS,
  TRIAL_DAYS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type PlanId = "starter" | "growth" | "agency";

const PLAN_META: Record<
  PlanId,
  { name: string; features: string[] }
> = {
  starter: {
    name: "Starter",
    features: [
      "All features included",
      `${PLAN_CREDITS.starter} AI Credits per month`,
      "Unlimited Ad Accounts & Businesses",
      "AI Ad Copy & Image Generation",
      "Buy more credits anytime",
    ],
  },
  growth: {
    name: "Growth",
    features: [
      "All features included",
      `${PLAN_CREDITS.growth} AI Credits per month`,
      "Unlimited Ad Accounts & Businesses",
      "AI Copy & Pro Image Generation",
      "Buy more credits anytime",
    ],
  },
  agency: {
    name: "Agency",
    features: [
      "All features included",
      `${PLAN_CREDITS.agency} AI Credits per month`,
      "Unlimited Ad Accounts & Businesses",
      "All AI Features + Video (Phase 2)",
      "Buy more credits anytime",
    ],
  },
};

// ─── Left Panel ───────────────────────────────────────────────────────────────

function PlanSummaryPanel({
  plan,
  spendKobo,
  isExpired,
  onGoToSettings,
}: {
  plan: PlanId;
  spendKobo: number;
  isExpired: boolean;
  onGoToSettings: () => void;
}) {
  const meta = PLAN_META[plan];
  const price = PLAN_PRICES[plan];
  const spendNgn = spendKobo / 100;
  const isTrialEligible = !isExpired;

  return (
    <div className="flex flex-col gap-6 p-8 bg-muted/50 h-full">
      {/* Plan name + price */}
      <div>
        <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">
          Your Plan
        </p>
        <h3 className="text-xl font-heading font-bold text-foreground leading-tight">
          {meta.name} Plan
        </h3>
        <div className="mt-3 flex items-baseline gap-1.5">
          {isTrialEligible && (
            <span className="text-base font-medium text-muted-foreground line-through leading-none">
              {formatCurrency(price)}
            </span>
          )}
          <span className="text-xl font-heading font-bold text-foreground leading-none">
            {isTrialEligible ? "₦0" : formatCurrency(price)}
          </span>
          <span className="text-sm text-subtle-foreground">/ per month</span>
        </div>
        {isTrialEligible && (
          <p className="text-xs text-subtle-foreground mt-1.5">
            Free for {TRIAL_DAYS} days, then{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(price)}/mo
            </span>
          </p>
        )}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
          <Xmark className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground">Cancel Anytime</span>
        </div>
        {isTrialEligible ? (
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
            <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">No Charge Now</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
            <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">Secure Payment</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground">
            {isTrialEligible ? `${TRIAL_DAYS}-Day Free Trial` : "Instant Access"}
          </span>
        </div>
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2">
          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground">Paystack Secured</span>
        </div>
      </div>

      {/* Settings link */}
      <button
        onClick={onGoToSettings}
        className="-mb-4 mt-auto flex items-center justify-center gap-1.5 text-sm text-primary hover:underline underline-offset-2 w-fit"
      >
        <Settings className="h-3.5 w-3.5" />
        Go To Account Settings
      </button>

      {/* Spend info — pinned to bottom */}
      <div className="rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-[11px] text-subtle-foreground leading-relaxed">
          Plan Based on Your Connected Account&apos;s Last 30 Days
        </p>
        <p className="text-sm font-bold text-foreground mt-1">
          {spendNgn === 0 ? (
            <span className="text-muted-foreground">₦0.00 Ad Spend detected</span>
          ) : (
            <>
              {formatCurrency(spendNgn)}{" "}
              <span className="font-normal text-subtle-foreground">Ad Spend</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function PaymentPanel({
  plan,
  isExpired,
  onSubscribe,
  loading,
}: {
  plan: PlanId;
  isExpired: boolean;
  onSubscribe: () => void;
  loading: boolean;
}) {
  const meta = PLAN_META[plan];
  const price = PLAN_PRICES[plan];

  return (
    <div className="flex flex-col gap-6 p-8 h-full">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-heading font-bold text-foreground leading-snug">
          {isExpired
            ? "Welcome Back, Let's Restart Your Plan"
            : `Welcome, Let's Start Your Plan`}
        </h2>
        <p className="text-sm text-subtle-foreground mt-1.5">
          {isExpired
            ? "Your subscription has expired. Reactivate to keep your campaigns running."
            : `Try free for ${TRIAL_DAYS} days — matched to your Meta ad spend automatically.`}
        </p>
      </div>

      {/* What's included */}
      <div>
        <p className="text-[11px] font-bold text-subtle-foreground uppercase tracking-widest mb-3">
          {meta.name} Plan Includes
        </p>
        <ul className="space-y-2.5">
          {meta.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5">
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA — pinned to bottom */}
      <div className="mt-auto space-y-3">
        

        <Button
          size="lg"
          className="w-full h-12 text-base font-bold gap-2 shadow-lg shadow-primary/20 rounded-lg text-primary-foreground hover:bg-primary/90"
          onClick={onSubscribe}
          disabled={loading}
        >
          {loading ? (
            <>
              <SystemRestart className="h-4 w-4 animate-spin" />
              Redirecting to Paystack...
            </>
          ) : (
            <>
              <Flash className="h-4 w-4 fill-current" />
              {isExpired
                ? `Reactivate — ${formatCurrency(price)}/mo`
                : `Start ${TRIAL_DAYS}-Day Free Trial`}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </>
          )}
        </Button>
{/* Paystack badge row */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Payment secured by{" "}
              <span className="font-semibold text-foreground">Paystack</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              You&apos;ll be redirected to complete payment securely
            </p>
          </div>
        </div>
       
      </div>
    </div>
  );
}

// ─── Main Gate Component ──────────────────────────────────────────────────────

export function SubscriptionGate({
  children,
  status,
}: {
  children: React.ReactNode;
  status: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: subscription, isLoading } = useSubscription();

  // ── Pass-throughs ──────────────────────────────────────────────────────────

  if (status === "active" || status === "trialing") {
    return <>{children}</>;
  }

  if (pathname === "/settings/general") {
    return <>{children}</>;
  }

  if (status === "past_due" && subscription?.org?.isInGracePeriod) {
    return <>{children}</>;
  }

  if (isLoading) return null;

  const currentTier = (subscription?.org?.tier ?? "starter") as PlanId;
  const spendKobo = subscription?.org?.spendKobo ?? 0;
  // expired = trial ended, canceled = manually canceled or grace lapsed, past_due = payment failed
  // All three mean the user has already had a trial — show reactivation messaging, not free trial
  const isExpired = ["past_due", "expired", "canceled"].includes(status);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { email, orgId } = await getPaymentContext();
      if (!orgId) throw new Error("No organization found");

      const callbackUrl = `${window.location.origin}/settings/subscription?success=true`;
      const { authorization_url } = await initializePaystackTransaction(
        email,
        currentTier,
        callbackUrl,
        orgId,
      );

      window.location.href = authorization_url;
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to start payment";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <>
      {children}

      <Dialog open modal>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="min-w-4xl p-0 gap-0 bg-card rounded-lg border-border overflow-hidden"
        >

          {/* Split body */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <PlanSummaryPanel
              plan={currentTier}
              spendKobo={spendKobo}
              isExpired={isExpired}
              onGoToSettings={() => router.push("/settings/general")}
            />
            <PaymentPanel
              plan={currentTier}
              isExpired={isExpired}
              onSubscribe={handleSubscribe}
              loading={loading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
