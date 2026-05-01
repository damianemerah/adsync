"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SystemRestart, Gift } from "iconoir-react";
import { CREDIT_PACKS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface CreditPacksSectionProps {
  orgStatus: string;
  isProcessing: string | null;
  onBuyPack: (packId: string) => void;
}

export function CreditPacksSection({ orgStatus, isProcessing, onBuyPack }: CreditPacksSectionProps) {
  const canBuy = ["active", "trialing"].includes(orgStatus);

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground">Need More Credits?</h2>
        <p className="text-subtle-foreground text-sm mt-1">
          One-off top-ups that stack on your plan. Credits never expire mid-cycle.
        </p>
      </div>

      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {CREDIT_PACKS.map((pack) => {
            const processingKey = `pack_${pack.id}`;
            const isProcessingThis = isProcessing === processingKey;
            const pricePerCredit = Math.round(pack.price / pack.credits);

            return (
              <div
                key={pack.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-muted/30 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-md bg-ai/10 flex items-center justify-center text-ai">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{pack.name}</p>
                      <Badge variant="secondary" className="text-xs bg-ai/10 text-ai border-none hover:bg-ai/10">
                        {pack.credits} credits
                      </Badge>
                    </div>
                    <p className="text-sm text-subtle-foreground">
                      {formatCurrency(pack.price)}{" "}
                      <span className="text-xs font-normal">({"₦"}{pricePerCredit}/credit)</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-border hover:bg-ai hover:text-ai-foreground hover:border-ai shrink-0"
                  onClick={() => onBuyPack(pack.id)}
                  disabled={isProcessingThis || !canBuy}
                >
                  {isProcessingThis ? (
                    <SystemRestart className="w-4 h-4 animate-spin" />
                  ) : (
                    "Buy Pack"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
