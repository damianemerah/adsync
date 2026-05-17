"use client";

import { type Invoice } from "@/actions/paystack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { Download } from "iconoir-react";

// ─────────────────────────────────────────────────────────────────────────────
// Type badge config
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<Invoice["type"], string> = {
  subscription: "Subscription",
  credit_pack: "Credit Pack",
};

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
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

  return <DataTable columns={columns} data={invoices} />;
}
