"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, Xmark, NavArrowDown } from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getMetaPendingAccounts } from "@/actions/ad-accounts";
import { cn } from "@/lib/utils";

interface MetaAccount {
  account_id: string;
  name: string;
  currency: string;
}

interface MetaAccountSelectDialogProps {
  sessionId: string;
  open: boolean;
  /** Called when the user successfully connects an account */
  onSuccess: () => void;
  /** Called when the dialog is dismissed without connecting */
  onClose: () => void;
}

export function MetaAccountSelectDialog({
  sessionId,
  open,
  onSuccess,
  onClose,
}: MetaAccountSelectDialogProps) {
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !sessionId) return;
    setLoading(true);
    setSelected(null);
    getMetaPendingAccounts(sessionId).then((result) => {
      if (result) {
        setAccounts(result.accounts);
      } else {
        toast.error("Session expired. Please reconnect your Meta account.");
        onClose();
      }
      setLoading(false);
    });
  }, [open, sessionId, onClose]);

  const selectedAccount = accounts.find((a) => a.account_id === selected);

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
        onSuccess();
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="sm:max-w-md w-full p-0 gap-0 border border-border overflow-visible"
        // Hide the default close button — we render our own
        showCloseButton={false}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors rounded-sm"
          aria-label="Close"
        >
          <Xmark className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6 border-b border-border">
          {/* Meta icon circle */}
          <div className="h-14 w-14 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
            <MetaIcon className="h-9 w-9" />
          </div>
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              Connect Meta Ads Account
            </DialogTitle>
            <DialogDescription className="text-sm text-subtle-foreground">
              Select and add your Meta Ads account
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Label */}
          <p className="text-sm font-semibold text-foreground">Ad Account</p>

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2].map((i) => (
                <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            /* Custom dropdown */
            <div className="relative">
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className={cn(
                  "w-full h-11 flex items-center justify-between px-4 rounded-lg border text-sm transition-all bg-white",
                  dropdownOpen
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50",
                )}
              >
                <span
                  className={cn(
                    selectedAccount ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {selectedAccount
                    ? `${selectedAccount.name} · (${selectedAccount.account_id})`
                    : "Select Account"}
                </span>
                <NavArrowDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    dropdownOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Dropdown list */}
              {dropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                  {accounts.map((account) => {
                    const isSelected = selected === account.account_id;
                    return (
                      <button
                        key={account.account_id}
                        type="button"
                        onClick={() => {
                          setSelected(account.account_id);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors",
                          isSelected
                            ? "bg-primary/5 text-primary"
                            : "text-foreground hover:bg-muted/50",
                        )}
                      >
                        <span>
                          {account.name}
                          <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                            · ({account.account_id})
                          </span>
                        </span>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Connect button */}
          <Button
            className="w-full h-11 font-semibold mt-1"
            disabled={!selected || isPending || loading}
            onClick={handleConnect}
          >
            {isPending ? "Connecting…" : "Connect Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
