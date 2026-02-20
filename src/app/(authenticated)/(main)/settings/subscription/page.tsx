import { Suspense } from "react";
import { BillingContent } from "@/components/subscription/billing-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Subscription & Payment
        </h2>
        <p className="text-sm text-slate-500">
          Manage your plan and billing details.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-96 rounded-xl" />
            </div>
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
