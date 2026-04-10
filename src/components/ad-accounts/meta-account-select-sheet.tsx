"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Facebook, CheckCircle } from "iconoir-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMetaPendingAccounts } from "@/actions/ad-accounts";

interface MetaAccount {
  account_id: string;
  name: string;
  currency: string;
}

interface MetaAccountSelectSheetProps {
  sessionId: string;
}

export function MetaAccountSelectSheet({
  sessionId,
}: MetaAccountSelectSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getMetaPendingAccounts(sessionId).then((result) => {
      if (result) {
        setAccounts(result.accounts);
      } else {
        toast.error("Session expired or not found. Please reconnect your Meta account.");
        router.replace("/settings/business");
      }
      setLoading(false);
    });
  }, [sessionId, router]);

  const handleConnect = () => {
    if (!selected) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/connect/meta/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, accountId: selected }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Failed to connect account");
          return;
        }

        toast.success("Ad account connected!");
        router.replace("/settings/business?success=meta_connected");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setOpen(false);
      router.replace("/settings/business");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Facebook className="w-5 h-5 text-facebook" />
            <SheetTitle>Choose an Ad Account</SheetTitle>
          </div>
          <SheetDescription>
            We found multiple Meta ad accounts. Select the one you want to
            connect to this workspace.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const isSelected = selected === account.account_id;
              return (
                <button
                  key={account.account_id}
                  onClick={() => setSelected(account.account_id)}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {account.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {account.account_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {account.currency}
                      </Badge>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            <Button
              className="w-full mt-4"
              disabled={!selected || isPending}
              onClick={handleConnect}
            >
              {isPending ? "Connecting..." : "Connect Selected Account"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
