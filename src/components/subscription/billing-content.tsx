"use client";

import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  SystemRestart,
  Gift,
} from "iconoir-react";
import {
  PLAN_IDS,
  PLAN_PRICES,
  PLAN_CREDITS,
  CREDIT_PACKS,
  TIER_CONFIG,
} from "@/lib/constants";
import {
  initializePaystackTransaction,
  initializeCreditPackPurchase,
  getPaymentContext,
} from "@/actions/paystack";
import { verifyAndActivate } from "@/actions/verify-payment";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

// Plan feature definitions
const PLANS = [
  {
    id: PLAN_IDS.STARTER,
    name: "Starter",
    price: PLAN_PRICES.starter,
    credits: PLAN_CREDITS.starter,
    tagline: "Perfect for solo SMEs",
    features: [
      `${PLAN_CREDITS.starter} AI credits / month`,
      `${TIER_CONFIG.starter.limits.maxAdAccounts} Meta Ad Account${TIER_CONFIG.starter.limits.maxAdAccounts > 1 ? "s" : ""}`,
      `${TIER_CONFIG.starter.limits.maxTeamMembers} Team Member${TIER_CONFIG.starter.limits.maxTeamMembers > 1 ? "s" : ""}`,
      `${TIER_CONFIG.starter.limits.maxMonthlyChats} AI chat sessions / month`,
      "AI Ad Copy (Free) + Image Generation",
      "Campaign Analytics",
    ],
    highlight: false,
  },
  {
    id: PLAN_IDS.GROWTH,
    name: "Growth",
    price: PLAN_PRICES.growth,
    credits: PLAN_CREDITS.growth,
    tagline: "For scaling businesses",
    features: [
      `${PLAN_CREDITS.growth} AI credits / month`,
      `Up to ${TIER_CONFIG.growth.limits.maxAdAccounts} Ad Accounts`,
      `Up to ${TIER_CONFIG.growth.limits.maxTeamMembers} Team Members`,
      `${TIER_CONFIG.growth.limits.maxMonthlyChats} AI chat sessions / month`,
      "AI Copy (Free) + Pro Image Generation",
      "Advanced Analytics + Rollover Credits",
    ],
    highlight: true,
  },
  {
    id: PLAN_IDS.AGENCY,
    name: "Agency",
    price: PLAN_PRICES.agency,
    credits: PLAN_CREDITS.agency,
    tagline: "Built for agencies managing multiple clients",
    features: [
      `${PLAN_CREDITS.agency} AI credits / month`,
      "Unlimited Accounts",
      `Up to ${TIER_CONFIG.agency.limits.maxTeamMembers} Team Members`,
      "Unlimited AI chat sessions",
      "All AI features + Video (Phase 2)",
      "Priority Support + Credit Rollover",
    ],
    highlight: false,
  },
];

export function BillingContent() {
  const { data: subscription, isLoading, refetch } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const verifiedRef = useRef(false);
  const [showPlans, setShowPlans] = useState(false);

  // ── Callback verification: handle redirect from Paystack ────────────────
  useEffect(() => {
    if (verifiedRef.current) return;

    const isSuccess = searchParams.get("success") === "true";
    const isPackSuccess = searchParams.get("pack_success") === "true";
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    if (reference && (isSuccess || isPackSuccess)) {
      verifiedRef.current = true;

      verifyAndActivate(reference)
        .then((result) => {
          if (result.success) {
            toast.success(
              result.alreadyProcessed
                ? "Payment confirmed!"
                : `Payment verified! ${result.planId ? `${result.planId} plan activated.` : "Credits added."}`,
            );
            refetch();
          }
        })
        .catch((err) => {
          console.error("Callback verification failed:", err);
          toast.error(
            "Could not verify payment. If charged, credits will be added shortly.",
          );
        })
        .finally(() => {
           // Clean up URL
           router.replace(`/settings/subscription`, { scroll: false });
        });
    }
  }, [searchParams, refetch, router]);

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(planId);
    try {
      const { email, orgId } = await getPaymentContext();
      const callbackUrl = `${window.location.origin}/settings/subscription?success=true`;
      const result = await initializePaystackTransaction(
        email,
        planId,
        callbackUrl,
        orgId,
      );
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      toast.error(msg);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleBuyPack = async (packId: string) => {
    setIsProcessing(`pack_${packId}`);
    try {
      const callbackUrl = `${window.location.origin}/settings/subscription?pack_success=true`;
      const result = await initializeCreditPackPurchase(packId, callbackUrl);
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "An error occurred";
      toast.error(msg);
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <SystemRestart className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTier = subscription?.org?.tier || "starter";
  const orgStatus = subscription?.org?.status || "expired";
  const creditsBalance = subscription?.org?.creditsBalance ?? 0;
  const creditQuota = subscription?.org?.creditQuota ?? 0;
  const creditsUsed = Math.max(0, creditQuota - creditsBalance);
  const creditsPercent =
    creditQuota > 0 ? Math.round((creditsUsed / creditQuota) * 100) : 0;

  return (
    <div className="space-y-12 w-full pb-8">
      {/* Current Subscription */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-heading font-semibold text-foreground">
            Current Subscription
          </h2>
        </div>
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-6 flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold capitalize">
                  {currentTier} Plan
                </h3>
                <Badge
                  variant={orgStatus === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {orgStatus}
                </Badge>
              </div>
              <p className="text-subtle-foreground text-sm">
                {orgStatus === "active"
                  ? `Renews ${formatDate(subscription?.org?.expiresAt?.toISOString() ?? null)}`
                  : `Expired ${formatDate(subscription?.org?.expiresAt?.toISOString() ?? null)}`}
              </p>

              {/* Credit meter */}
              {creditQuota > 0 && (
                <div className="space-y-1 flex-1 max-w-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle-foreground font-medium">
                      AI Credits used
                    </span>
                    <span className="font-bold">
                      {creditsUsed} <span className="text-subtle-foreground font-normal">/ {creditQuota}</span>
                    </span>
                  </div>
                  <Progress value={creditsPercent} className="h-2" />
                  <p className="text-xs text-subtle-foreground">
                    {creditsBalance} credits remaining - resets on renewal
                  </p>
                </div>
              )}
            </div>

            {orgStatus !== "active" && (
              <Button
                onClick={() => handleUpgrade(currentTier)}
                disabled={isProcessing !== null}
                size="lg"
              >
                {isProcessing === currentTier ? (
                  <SystemRestart className="w-5 h-5 animate-spin" />
                ) : (
                  "Renew Subscription"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Credit Pack Top-Ups */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-heading font-semibold text-foreground">
            Need More Credits?
          </h2>
          <p className="text-subtle-foreground text-sm mt-1">
            One-off top-ups that stack on your plan. Credits never expire mid-cycle.
          </p>
        </div>
        
        <Card className="bg-card border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {CREDIT_PACKS.map((pack) => {
              const processingKey = `pack_${pack.id}`;
              const isProcessingThis = isProcessing === processingKey;
              const pricePerCredit = Math.round(pack.price / pack.credits);
              
              return (
                <div
                  key={pack.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-md bg-ai/10 flex items-center justify-center text-ai">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-base font-bold text-foreground">{pack.name}</p>
                        <Badge variant="secondary" className="text-xs bg-ai/10 text-ai border-none hover:bg-ai/10 font-bold">
                          {pack.credits} credits
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-subtle-foreground">
                        {formatCurrency(pack.price)} <span className="text-xs font-normal">({"₦"}{pricePerCredit}/credit)</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto font-bold border-border hover:bg-ai hover:text-ai-foreground hover:border-ai shrink-0"
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={isProcessingThis || orgStatus !== "active"}
                  >
                    {isProcessingThis ? (
                      <SystemRestart className="w-4 h-4 animate-spin" />
                    ) : (
                      `Buy Pack`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
        {orgStatus !== "active" && (
          <div className="mt-4 p-4 rounded-md bg-muted/40 border border-border text-sm text-subtle-foreground">
            You need an active subscription to purchase credit packs.
          </div>
        )}
      </section>

      {/* Plan Cards */}
      <section className="pt-4 border-t border-border mt-4">
        {!showPlans ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/30 rounded-lg p-6 border border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Looking to change your plan?
              </h2>
              <p className="text-sm text-subtle-foreground mt-1">
                Upgrade or downgrade your subscription to better fit your business needs.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 sm:mt-0 font-bold border-border bg-background"
              onClick={() => setShowPlans(true)}
            >
              View Available Plans
            </Button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-semibold text-foreground">
                Available Plans
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPlans(false)}
                className="text-subtle-foreground hover:text-foreground font-medium"
              >
                Hide Plans
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => {
                const isCurrent = currentTier === plan.id;
                const isProcessingThis = isProcessing === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col ${
                      plan.highlight
                        ? "border-accent ring-1 ring-accent/20"
                        : "border-border shadow-sm"
                    } ${isCurrent ? "opacity-90 bg-muted/20" : "bg-card"}`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-accent hover:bg-accent text-accent-foreground px-3 py-0.5 text-xs font-bold shadow-none">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        {plan.name}
                        {isCurrent && <Check className="text-primary w-5 h-5" />}
                      </CardTitle>
                      <CardDescription>{plan.tagline}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col flex-1">
                      <div className="mb-6">
                        <span className="text-4xl font-black">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-subtle-foreground text-sm font-medium">
                          /month
                        </span>
                      </div>

                      <ul className="space-y-3 mb-8 text-sm text-subtle-foreground flex-1">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={3} />
                            <span className="font-medium">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full font-bold"
                        variant={
                          isCurrent
                            ? "outline"
                            : plan.highlight
                              ? "default"
                              : "secondary"
                        }
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrent || isProcessing !== null}
                      >
                        {isProcessingThis ? (
                          <SystemRestart className="w-4 h-4 animate-spin" />
                        ) : isCurrent ? (
                          "Current Plan"
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
