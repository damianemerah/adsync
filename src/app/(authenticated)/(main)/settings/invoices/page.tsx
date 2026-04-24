"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvoices, type Invoice } from "@/actions/paystack";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { Download, SystemRestart } from "iconoir-react";

// ─────────────────────────────────────────────────────────────────────────────
// Type badge config
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<Invoice["type"], string> = {
  subscription: "Subscription",
  credit_pack: "Credit Pack",
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
      render: (row) => (
        <span className="text-sm text-subtle-foreground">
          {TYPE_LABELS[row.type] || row.type}
        </span>
      ),
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
    {
      key: "actions",
      title: "",
      render: (row) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-subtle-foreground hover:text-foreground"
            title="Download Receipt"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download Receipt</span>
          </Button>
        </div>
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



      {/* Unified table */}
      <DataTable columns={columns} data={invoices} />
    </div>
  );
}
