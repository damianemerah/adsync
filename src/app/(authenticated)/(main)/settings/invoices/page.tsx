"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoices, type Invoice } from "@/actions/paystack";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { SystemRestart } from "iconoir-react";

// ─────────────────────────────────────────────────────────────────────────────
// Type badge config
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<
  Invoice["type"],
  { label: string; variant: "default" | "secondary" }
> = {
  subscription: { label: "Subscription", variant: "default" },
  credit_pack: { label: "Credit Pack", variant: "secondary" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getInvoices(100),
    staleTime: 2 * 60 * 1000,
  });

  const columns: Column<Invoice>[] = [
    {
      key: "date",
      title: "Date",
      render: (row) => formatDate(row.date),
    },
    {
      key: "type",
      title: "Type",
      render: (row) => {
        const config = TYPE_LABELS[row.type];
        return (
          <Badge variant={config.variant} className="text-xs">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "description",
      title: "Description",
      render: (row) => <span className="text-sm">{row.description}</span>,
    },
    {
      key: "amount_display",
      title: "Amount",
      render: (row) => (
        <span className="font-medium">{row.amount_display}</span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge
          variant={row.status === "success" ? "default" : "destructive"}
          className="capitalize text-xs"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "reference",
      title: "Reference",
      render: (row) => (
        <span className="text-xs text-subtle-foreground font-mono truncate max-w-[120px] block">
          {row.reference || "—"}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <SystemRestart className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Invoices &amp; Payment History
        </h2>
        <p className="text-sm text-subtle-foreground">
          All subscription payments and credit pack purchases in one place.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/40 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₦
              {(
                invoices.reduce((sum, inv) => sum + inv.amount_kobo, 0) / 100
              ).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₦
              {(
                invoices
                  .filter((inv) => {
                    const invDate = new Date(inv.date);
                    const now = new Date();
                    return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, inv) => sum + inv.amount_kobo, 0) / 100
              ).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unified table */}
      <DataTable columns={columns} data={invoices} />
    </div>
  );
}
