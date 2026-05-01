"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus } from "lucide-react";
import { SystemRestart } from "iconoir-react";
import { CardBrandLogo } from "./card-brand-icon";

interface PaymentMethodSectionProps {
  card: { last4: string; cardType: string | null; bank: string | null; expiry: string | null } | null;
  isProcessing: string | null;
  onAddPaymentMethod: () => void;
}

export function PaymentMethodSection({ card, isProcessing, onAddPaymentMethod }: PaymentMethodSectionProps) {
  return (
    <section>
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-medium text-foreground">Payment Method</h3>
              <p className="text-sm text-subtle-foreground mt-0.5">Change how you pay for your plan.</p>
            </div>
            <Button
              variant="outline"
              className="gap-2 bg-background shrink-0 border-border"
              onClick={onAddPaymentMethod}
              disabled={isProcessing === "card_auth"}
            >
              {isProcessing === "card_auth" ? (
                <SystemRestart className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {card ? "Update Card" : "Add Payment Method"}
            </Button>
          </div>

          {card ? (
            <div className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between bg-background w-full gap-4">
              <div className="flex items-center gap-4">
                <CardBrandLogo cardType={card.cardType} />
                <div>
                  <p className="text-sm text-foreground capitalize">
                    {card.cardType || "Card"} ending in {card.last4}
                  </p>
                  <p className="text-xs text-subtle-foreground">
                    {card.bank ? `${card.bank} · ` : ""}
                    {card.expiry ? `Expiry ${card.expiry}` : ""}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-none text-xs self-start sm:self-auto"
              >
                Default Method
              </Badge>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-subtle-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No payment method saved yet.</p>
              <p className="text-xs mt-1">
                We&apos;ll redirect you to Paystack to securely save your card. A ₦0 authorization
                check will be made and immediately reversed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
