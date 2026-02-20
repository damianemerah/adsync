"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, SystemRestart, Flash } from "iconoir-react";
import {
  getPaymentContext,
  initializePaystackTransaction,
} from "@/actions/paystack";
import { toast } from "sonner";
import { PLAN_PRICES, PLAN_CREDITS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which plan to upsell to – defaults to 'starter' */
  planId?: "starter" | "growth" | "agency";
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    `${PLAN_CREDITS.starter} AI credits / month`,
    "1 Meta Ad Account",
    "AI Image & Copy Generation",
    "Campaign Analytics",
  ],
  growth: [
    `${PLAN_CREDITS.growth} AI credits / month`,
    "3 Meta Ad Accounts + 5 Members",
    "Pro Image Generation",
    "Credit Rollover",
  ],
  agency: [
    `${PLAN_CREDITS.agency} AI credits / month`,
    "10 Ad Accounts + 25 Members",
    "All AI features including Video (soon)",
    "Priority Support",
  ],
};

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};

export function PaymentDialog({
  open,
  onOpenChange,
  planId = "starter",
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  const features = PLAN_FEATURES[planId] ?? PLAN_FEATURES.starter;
  const planName = PLAN_NAMES[planId] ?? "Starter";
  const price = PLAN_PRICES[planId] ?? PLAN_PRICES.starter;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { email, orgId } = await getPaymentContext();
      if (!orgId) throw new Error("No organization found");

      const callbackUrl = `${window.location.origin}/settings/subscription?success=true`;

      const { authorization_url } = await initializePaystackTransaction(
        email,
        planId,
        callbackUrl,
        orgId,
      );

      window.location.href = authorization_url;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to start payment";
      console.error("Payment Error:", error);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-ai/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Flash className="w-6 h-6 text-ai" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            Upgrade to {planName}
          </DialogTitle>
          <DialogDescription className="text-center">
            Unlock your full AdSync experience with AI-powered ad creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-xl border border-border">
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-bold text-lg">{planName} Plan</span>
              <span className="text-2xl font-black">
                {formatCurrency(price)}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </span>
            </div>
            <ul className="space-y-2 mt-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <Button
            className="w-full h-12 text-base font-bold rounded-xl"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <>
                <SystemRestart className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Subscribe & Launch – ${formatCurrency(price)}/mo`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secured by Paystack. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
