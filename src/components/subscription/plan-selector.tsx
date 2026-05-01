"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { SystemRestart } from "iconoir-react";
import { BILLING_PLANS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface PlanSelectorProps {
  currentTier: string;
  isProcessing: string | null;
  onUpgrade: (planId: string) => void;
}

export function PlanSelector({ currentTier, isProcessing, onUpgrade }: PlanSelectorProps) {
  const [showPlans, setShowPlans] = useState(false);

  if (!showPlans) {
    return (
      <section className="pt-4 border-t border-border mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/30 rounded-lg p-6 border border-border">
          <div>
            <h2 className="text-lg text-foreground">Looking to change your plan?</h2>
            <p className="text-sm text-subtle-foreground mt-1">
              Upgrade or downgrade your subscription to better fit your business needs.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-4 sm:mt-0 border-border bg-background"
            onClick={() => setShowPlans(true)}
          >
            View Available Plans
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-4 border-t border-border mt-4">
      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-heading text-foreground">Available Plans</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlans(false)}
            className="text-subtle-foreground hover:text-foreground"
          >
            Hide Plans
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-x-6">
          {BILLING_PLANS.map((plan) => {
            const isCurrent = currentTier === plan.id;
            const isProcessingThis = isProcessing === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.highlight ? "border-accent ring-1 ring-accent/20" : "border-border shadow-sm"
                } ${isCurrent ? "opacity-90 bg-muted/20" : "bg-card"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-accent hover:bg-accent text-accent-foreground px-3 py-0.5 text-xs shadow-none">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    {plan.name}
                    {isCurrent && <Check className="text-primary w-5 h-5" />}
                  </CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-black">{formatCurrency(plan.price)}</span>
                    <span className="text-subtle-foreground text-sm">/month</span>
                  </div>

                  <ul className="space-y-3 mb-8 text-sm text-subtle-foreground flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={3} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : plan.highlight ? "default" : "secondary"}
                    onClick={() => onUpgrade(plan.id)}
                    disabled={isCurrent || isProcessing !== null}
                  >
                    {isProcessingThis ? (
                      <SystemRestart className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
