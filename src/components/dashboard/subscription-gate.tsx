"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Flash, ArrowRight, Check, Lock } from "iconoir-react";
import { useSubscription } from "@/hooks/use-subscription";
import { PaymentDialog } from "@/components/billing/payment-dialog";
import { PLAN_PRICES, PLAN_CREDITS, TIER_CONFIG } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const GATE_PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: formatCurrency(PLAN_PRICES.starter),
    features: [
      `${TIER_CONFIG.starter.limits.maxAdAccounts} Ad Account`,
      `${PLAN_CREDITS.starter} AI Credits/mo`,
      "AI Copy & Images",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: formatCurrency(PLAN_PRICES.growth),
    recommended: true,
    features: [
      `${TIER_CONFIG.growth.limits.maxAdAccounts} Ad Accounts`,
      `${PLAN_CREDITS.growth} AI Credits/mo`,
      "Advanced AI + WhatsApp Alerts",
      `${TIER_CONFIG.growth.limits.maxTeamMembers} Team Members`,
    ],
  },
  {
    id: "agency" as const,
    name: "Agency",
    price: formatCurrency(PLAN_PRICES.agency),
    features: [
      "Unlimited Accounts",
      `${PLAN_CREDITS.agency} AI Credits/mo`,
      "Premium AI + Priority Support",
    ],
  },
];

export function SubscriptionGate({
  children,
  status,
}: {
  children: React.ReactNode;
  status: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<
    "starter" | "growth" | "agency"
  >("growth");
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: subscription } = useSubscription();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Pass through: active or trialing
  if (status === "active" || status === "trialing") {
    return <>{children}</>;
  }

  // Allow access to subscription/billing page to pay
  if (pathname === "/settings/subscription" || pathname === "/billing") {
    return <>{children}</>;
  }

  if (!isClient) return null;

  const prevTier = subscription?.org?.tier ?? "growth";
  const prevTierLabel = prevTier.charAt(0).toUpperCase() + prevTier.slice(1);

  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your trial has ended
          </h2>
          <p className="text-subtle-foreground max-w-md mx-auto">
            Your 14-day {prevTierLabel} trial is over. Subscribe to a plan to
            keep your campaigns running and access all features.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {GATE_PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "relative cursor-pointer rounded-lg border-2 p-5 transition-all",
                selectedPlan === plan.id
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-lg font-black text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-xs text-subtle-foreground">/mo</span>
                  </div>
                </div>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all mt-0.5",
                    selectedPlan === plan.id
                      ? "border-primary bg-primary"
                      : "border-slate-300",
                  )}
                >
                  {selectedPlan === plan.id && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => setPaymentOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xl shadow-slate-900/15 gap-2 h-12 px-8"
          >
            <Flash className="h-4 w-4 fill-current" />
            Subscribe to {
              GATE_PLANS.find((p) => p.id === selectedPlan)?.name
            } — {GATE_PLANS.find((p) => p.id === selectedPlan)?.price}/mo
          </Button>

          <Button
            size="lg"
            onClick={() => router.push("/settings/subscription")}
            className="h-12 gap-2 text-muted-foreground"
          >
            View all plans
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-subtle-foreground mt-4">
          Secured by Paystack · Cancel anytime
        </p>
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        planId={selectedPlan}
      />
    </div>
  );
}
