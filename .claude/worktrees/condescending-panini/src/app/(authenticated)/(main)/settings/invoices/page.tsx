"use client";

import { useState, useEffect } from "react";
import { getUnifiedInvoices, type UnifiedInvoice } from "@/actions/ad-budget";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { SystemRestart } from "iconoir-react";

// ─────────────────────────────────────────────────────────────────────────────
// Type badge config
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<
  UnifiedInvoice["type"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  subscription: { label: "Subscription", variant: "default" },
  credit_pack: { label: "Credit Pack", variant: "secondary" },
  ad_budget_topup: { label: "Ad Budget", variant: "outline" },
  card_load: { label: "Card Load", variant: "outline" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const data = await getUnifiedInvoices(100);
        setInvoices(data);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  const columns: Column<UnifiedInvoice>[] = [
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
      key: "fee_display",
      title: "Fee",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.fee_display || "—"}
        </span>
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
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px] block">
          {row.reference || "—"}
        </span>
      ),
    },
  ];

  if (loading) {
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
          Invoices & Payment History
        </h2>
        <p className="text-sm text-subtle-foreground">
          All subscription payments, credit pack purchases, and ad budget
          top-ups in one place.
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
              Fees Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {invoices.some((inv) => inv.fee_display)
                ? invoices
                    .filter((inv) => inv.fee_display)
                    .reduce((sum, inv) => {
                      const feeNum =
                        parseInt(inv.fee_display!.replace(/[₦,]/g, ""), 10) ||
                        0;
                      return sum + feeNum;
                    }, 0)
                    .toLocaleString()
                    .replace(/^/, "₦")
                : "₦0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unified table */}
      <DataTable columns={columns} data={invoices} />
    </div>
  );
}
