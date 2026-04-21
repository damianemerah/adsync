"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparks } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/billing/payment-dialog";

/**
 * Rendered by the server page when the org has no active subscription.
 * Kept as a small, focused "use client" leaf — the only piece of interactivity
 * needed at this point in the flow.
 */
export function SubscriptionGate() {
  const router = useRouter();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="h-16 w-16 bg-ai/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparks className="h-8 w-8 text-ai" />
        </div>
        <h2 className="text-2xl font-bold font-heading">
          Subscription Required
        </h2>
        <p className="text-subtle-foreground text-sm">
          You need an active subscription or trial to create ads and generate AI
          creatives.
        </p>
        <Button
          className="w-full mt-4 font-bold h-12 rounded-md"
          onClick={() => setIsPaymentOpen(true)}
        >
          Upgrade Plan
        </Button>
        <Button
          variant="ghost"
          className="w-full text-subtle-foreground"
          onClick={() => router.push("/campaigns")}
        >
          Go Back
        </Button>
      </div>

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={(open) => {
          setIsPaymentOpen(open);
          // On dialog close without upgrading, return to campaigns list
          if (!open) router.push("/campaigns");
        }}
      />
    </div>
  );
}
