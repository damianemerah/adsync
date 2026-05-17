import { Suspense } from "react";
import { connection } from "next/server";
import { InvoicesLoader } from "./invoices-loader";
import { InvoicesTableSkeleton } from "./loading";

export const metadata = {
  title: "Invoices | Settings | Tenzu",
  description: "View all subscription payments and credit pack purchases",
};

export default async function InvoicesPage() {
  await connection();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading font-medium text-foreground">
          Invoices &amp; Payment History
        </h2>
        <p className="text-sm text-subtle-foreground">
          All subscription payments and credit pack purchases in one place.
        </p>
      </div>

      <Suspense fallback={<InvoicesTableSkeleton />}>
        <InvoicesLoader />
      </Suspense>
    </div>
  );
}
