import { getInvoices } from "@/actions/paystack";
import { InvoicesClient } from "./invoices-client";

/**
 * Async Server Component — fetches invoices from Paystack and passes
 * them to the client table. Rendered inside a <Suspense> boundary in page.tsx
 * so the page shell streams immediately.
 */
export async function InvoicesLoader() {
  const invoices = await getInvoices(100);
  return <InvoicesClient invoices={invoices} />;
}
