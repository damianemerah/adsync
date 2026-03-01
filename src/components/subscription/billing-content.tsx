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
  Flash,
  MediaImage,
  MediaVideo,
  Sparks,
  Gift,
} from "iconoir-react";
import {
  PLAN_IDS,
  PLAN_PRICES,
  PLAN_CREDITS,
  CREDIT_COSTS,
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
import { useSearchParams } from "next/navigation";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatCurrency, formatKobo, formatDate } from "@/lib/utils";

type Transaction = {
  id: string;
  reference: string;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
};

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
      "All AI features + Video (Phase 2)",
      "Priority Support + Credit Rollover",
    ],
    highlight: false,
  },
];

// Credit cost breakdown — text is free
const CREDIT_BREAKDOWN = [
  {
    icon: MediaImage,
    label: "Image Generate",
    credits: CREDIT_COSTS.IMAGE_GEN_PRO,
    isFree: false,
    note: "AI-powered",
  },
  {
    icon: Sparks,
    label: "Image Edit",
    credits: CREDIT_COSTS.IMAGE_EDIT_PRO,
    isFree: false,
    note: "AI-powered",
  },
  {
    icon: Flash,
    label: "AI Ad Copy",
    credits: 0,
    isFree: true,
    note: "Always Free",
  },
  {
    icon: MediaVideo,
    label: "Video - 5s",
    credits: CREDIT_COSTS.VIDEO_KLING_5S,
    isFree: false,
    note: "Coming Soon",
  },
];

export function BillingContent() {
  const { data: subscription, isLoading, refetch } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const verifiedRef = useRef(false);

  // ── Callback verification: handle redirect from Paystack ────────────────
  useEffect(() => {
    if (verifiedRef.current) return;
    const isSuccess =
      searchParams.get("success") === "true" ||
      searchParams.get("pack_success") === "true";
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");

    if (isSuccess && reference) {
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
        });
    }
  }, [searchParams, refetch]);

  const columns: Column<Transaction>[] = [
    { key: "reference", title: "Reference" },
    {
      key: "description",
      title: "Description",
      render: (row) => row.description ?? "-",
    },
    {
      key: "amount_cents",
      title: "Amount",
      render: (row) => formatKobo(row.amount_cents),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge
          variant={row.status === "success" ? "default" : "destructive"}
          className="capitalize"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "created_at",
      title: "Date",
      render: (row) => formatDate(row.created_at),
    },
  ];

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
  const transactions =
    (subscription?.transactions as unknown as Transaction[]) || [];

  return (
    <div className="space-y-10">
      {/* Current Plan */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4">
          Current Subscription
        </h2>
        <Card className="bg-muted/40 border-border">
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
                <div className="space-y-1 max-w-sm">
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle-foreground">
                      AI Credits used
                    </span>
                    <span className="font-medium">
                      {creditsUsed} / {creditQuota}
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
              >
                {isProcessing === currentTier ? (
                  <SystemRestart className="w-4 h-4 animate-spin" />
                ) : (
                  "Renew Subscription"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Credit Cost Breakdown */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-1">Credit Costs</h2>
        <p className="text-subtle-foreground text-sm mb-4">
          1 credit = {"\u20a6"}50 of AI value. Text & copy generation is always
          free.
        </p>
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CREDIT_BREAKDOWN.map(
            ({ icon: Icon, label, credits, isFree, note }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isFree ? "bg-green-500/10" : "bg-ai/10"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isFree ? "text-green-600" : "text-ai"}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  {isFree ? (
                    <p className="text-xs font-bold text-green-600">
                      FREE - {note}
                    </p>
                  ) : (
                    <p className="text-xs text-subtle-foreground">
                      {credits} credit{credits !== 1 ? "s" : ""} - {note}
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
        </div> */}
      </section>

      {/* Credit Pack Top-Ups */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-1">
          Need More Credits?
        </h2>
        <p className="text-subtle-foreground text-sm mb-4">
          One-off top-ups that stack on your plan. Credits never expire
          mid-cycle.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => {
            const processingKey = `pack_${pack.id}`;
            const isProcessingThis = isProcessing === processingKey;
            const pricePerCredit = Math.round(pack.price / pack.credits);
            return (
              <div
                key={pack.id}
                className="flex flex-col rounded-xl border border-border bg-muted/30 p-5 gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="w-4 h-4 text-primary" />
                      <p className="text-sm font-bold">{pack.name}</p>
                    </div>
                    <p className="text-2xl font-black">
                      {pack.credits}{" "}
                      <span className="text-sm font-normal text-subtle-foreground">
                        credits
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatCurrency(pack.price)}
                    </p>
                    <p className="text-xs text-subtle-foreground">
                      {"\u20a6"}
                      {pricePerCredit}/credit
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={isProcessingThis || orgStatus !== "active"}
                >
                  {isProcessingThis ? (
                    <SystemRestart className="w-4 h-4 animate-spin" />
                  ) : (
                    `Buy ${pack.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {orgStatus !== "active" && (
          <p className="text-xs text-subtle-foreground mt-3">
            You need an active subscription to purchase credit packs.
          </p>
        )}
      </section>

      {/* Plan Cards */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isProcessingThis = isProcessing === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlight
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                } ${isCurrent ? "opacity-90" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs font-bold">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && <Check className="text-primary w-5 h-5" />}
                  </CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-1">
                  <div className="mb-5">
                    <span className="text-3xl font-black">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-subtle-foreground text-sm">
                      /month
                    </span>
                  </div>

                  <ul className="space-y-2 mb-6 text-sm text-subtle-foreground flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={
                      isCurrent
                        ? "outline"
                        : plan.highlight
                          ? "default"
                          : "outline"
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
      </section>

      {/* Payment History */}
      <section>
        <h2 className="text-lg font-heading font-bold mb-4">Payment History</h2>
        <DataTable columns={columns} data={transactions} />
      </section>
    </div>
  );
}
