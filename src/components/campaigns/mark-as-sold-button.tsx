"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "iconoir-react";
import { recordSale } from "@/actions/sales";
import { toast } from "sonner";

interface MarkAsSoldButtonProps {
  campaignId: string;
  /** Callback after a sale is recorded — parent can invalidate queries */
  onSaleRecorded?: () => void;
}

/**
 * "Sold! 🎉" button that opens a dialog for recording a sale amount.
 * Phase 1B — calls the recordSale server action to persist to whatsapp_sales.
 */
export function MarkAsSoldButton({
  campaignId,
  onSaleRecorded,
}: MarkAsSoldButtonProps) {
  const [open, setOpen] = useState(false);
  const [amountNgn, setAmountNgn] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justRecorded, setJustRecorded] = useState(false);

  const handleSubmit = async () => {
    const value = parseInt(amountNgn, 10);
    if (!value || value <= 0) return;

    setIsSubmitting(true);
    try {
      await recordSale({ campaignId, amountNgn: value });
      toast.success(`₦${value.toLocaleString()} sale recorded!`);

      setJustRecorded(true);
      onSaleRecorded?.();

      // Reset after brief success flash
      setTimeout(() => {
        setOpen(false);
        setAmountNgn("");
        setJustRecorded(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to record sale:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
        >
          {justRecorded ? (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Recorded!
            </>
          ) : (
            "Sold! 🎉"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Record a Sale</DialogTitle>
          <DialogDescription>
            How much did you earn from this customer? This helps track your
            return on ad spend.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="sale-amount" className="text-sm font-semibold">
              Sale Amount (₦)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground font-medium">
                ₦
              </span>
              <Input
                id="sale-amount"
                type="number"
                min="1"
                placeholder="15,000"
                value={amountNgn}
                onChange={(e) => setAmountNgn(e.target.value)}
                className="pl-7 bg-muted border-border font-mono text-lg"
                autoFocus
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amountNgn || parseInt(amountNgn) <= 0 || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {isSubmitting ? "Saving…" : "Record Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
