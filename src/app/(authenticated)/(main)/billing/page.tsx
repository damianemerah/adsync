import { Suspense } from "react";
import { BillingContent } from "./billing-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col min-w-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Billing
          </h1>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-12">
        <Suspense
          fallback={
            <div className="space-y-8">
              <Skeleton className="h-64 w-full rounded-xl" />
              <div className="grid md:grid-cols-3 gap-6">
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
              </div>
            </div>
          }
        >
          <BillingContent />
        </Suspense>
      </main>
    </div>
  );
}
