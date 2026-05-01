"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { BILLING_PLANS } from "@/lib/constants";
import {
  initializePaystackTransaction,
  initializeCreditPackPurchase,
  initializeCardAuthorization,
  cancelPaystackSubscription,
  getPaymentContext,
} from "@/actions/paystack";
import { verifyAndActivate } from "@/actions/verify-payment";
import { toast } from "sonner";
import { SystemRestart } from "iconoir-react";
import { AlertTriangle, XCircle } from "lucide-react";
import { BillingSkeleton } from "./billing-skeleton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { SubscriptionOverviewCard } from "./subscription-overview-card";
import { PaymentMethodSection } from "./payment-method-section";
import { CreditPacksSection } from "./credit-packs-section";
import { PlanSelector } from "./plan-selector";

export function BillingContent() {
  const { data: subscription, isLoading, refetch } = useSubscription();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const verifiedRef = useRef(false);

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
          toast.error("Could not verify payment. If charged, credits will be added shortly.");
        })
        .finally(() => {
          router.replace(`/settings/subscription`, { scroll: false });
        });
    }
  }, [searchParams, refetch, router]);

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(planId);
    try {
      const { email, orgId } = await getPaymentContext();
      const callbackUrl = `${window.location.origin}/settings/subscription?success=true`;
      const result = await initializePaystackTransaction(email, planId, callbackUrl, orgId);
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize payment");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
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
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddPaymentMethod = async () => {
    setIsProcessing("card_auth");
    try {
      const callbackUrl = `${window.location.origin}/settings/subscription?card_saved=true`;
      const result = await initializeCardAuthorization(callbackUrl);
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        toast.error("Failed to initialize card setup");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const result = await cancelPaystackSubscription();
      if (result.success) {
        toast.success("Subscription canceled. You'll retain access until your billing period ends.");
        refetch();
      } else {
        toast.error(result.error || "Failed to cancel subscription");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return <BillingSkeleton />;
  }

  const currentTier = subscription?.org?.tier || "starter";
  const orgStatus = subscription?.org?.status || "expired";
  const creditsBalance = subscription?.org?.creditsBalance ?? 0;
  const creditQuota = subscription?.org?.creditQuota ?? 0;
  const card = subscription?.org?.card ?? null;
  const isInGracePeriod = subscription?.org?.isInGracePeriod ?? false;
  const graceEndsAt = subscription?.org?.graceEndsAt;
  const expiresAt = subscription?.org?.expiresAt;
  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24)))
    : 0;

  const currentPlan = BILLING_PLANS.find((p) => p.id === currentTier) ?? BILLING_PLANS[0];

  return (
    <div className="space-y-12 w-full pb-8">
      {/* Grace Period / Past Due Banner */}
      {orgStatus === "past_due" && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            isInGracePeriod
              ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {isInGracePeriod ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {isInGracePeriod ? (
              <>
                <span className="font-medium">Payment failed.</span>{" "}
                Your account stays active until{" "}
                <span className="font-medium">{formatDate(graceEndsAt?.toISOString() ?? null)}</span>.
                {" "}Update your payment method below to avoid interruption.
              </>
            ) : (
              <>
                <span className="font-medium">Your subscription has lapsed.</span>{" "}
                Renew now to restore full access to Tenzu.
              </>
            )}
          </div>
          <Button
            size="sm"
            variant={isInGracePeriod ? "outline" : "destructive"}
            className="shrink-0 text-xs h-7"
            onClick={() => handleUpgrade(currentTier)}
            disabled={isProcessing !== null}
          >
            {isProcessing === currentTier ? (
              <SystemRestart className="w-3 h-3 animate-spin" />
            ) : (
              "Renew Now"
            )}
          </Button>
        </div>
      )}

      <SubscriptionOverviewCard
        currentPlan={currentPlan}
        orgStatus={orgStatus}
        daysUntilExpiry={daysUntilExpiry}
        expiresAt={expiresAt}
        creditsBalance={creditsBalance}
        creditQuota={creditQuota}
        card={card}
        isProcessing={isProcessing}
        isCanceling={isCanceling}
        onUpgrade={handleUpgrade}
        onAddPaymentMethod={handleAddPaymentMethod}
        onCancelSubscription={handleCancelSubscription}
        currentTier={currentTier}
      />

      <PaymentMethodSection
        card={card}
        isProcessing={isProcessing}
        onAddPaymentMethod={handleAddPaymentMethod}
      />

      <CreditPacksSection
        orgStatus={orgStatus}
        isProcessing={isProcessing}
        onBuyPack={handleBuyPack}
      />

      <PlanSelector
        currentTier={currentTier}
        isProcessing={isProcessing}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
