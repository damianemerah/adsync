import { Suspense } from "react";
import { BillingContent } from "@/components/subscription/billing-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  return (
    <div className="space-y-6">
     
      <Suspense
        fallback={
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-md" />
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-96 rounded-md" />
              <Skeleton className="h-96 rounded-md" />
            </div>
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
