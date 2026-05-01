"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Xmark, ArrowRight } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

const DISMISS_KEY = "payment_method_banner_dismissed";

export function PaymentMethodBanner() {
  const { data, isLoading } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (isLoading || dismissed) return null;

  const status = data?.org?.status;
  const hasPaymentMethod = data?.org?.card !== null && data?.org?.card !== undefined;

  // Only nudge trialing users who haven't added a payment method yet
  if (status !== "trialing" || hasPaymentMethod) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b px-4 py-3 bg-amber-50 border-amber-200/60"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left — icon + message */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <CreditCard className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm font-medium leading-snug text-amber-900">
            <span className="font-bold">No payment method on file.</span>{" "}
            Add one now so your account stays active when your trial ends — we support cards, bank transfer, Opay, and more.
          </p>
        </div>

        {/* Right — CTA row */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => router.push("/settings/subscription")}
            className="min-h-11 flex-1 sm:flex-none px-4 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white border-0"
          >
            Add Payment Method
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <button
            onClick={handleDismiss}
            className="min-h-11 w-11 rounded-lg flex items-center justify-center shrink-0 text-amber-600/70 hover:text-amber-800 hover:bg-amber-100 transition-colors"
            aria-label="Dismiss payment method banner"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
