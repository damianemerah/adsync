"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  MoreVertical,
  CreditCard,
  Info,
  Sparkles,
  Plus,
  Coins,
} from "lucide-react";
import { SystemRestart } from "iconoir-react";
import { CardBrandIcon } from "./card-brand-icon";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SubscriptionOverviewCardProps {
  currentPlan: { name: string; tagline: string; price: number };
  orgStatus: string;
  daysUntilExpiry: number;
  expiresAt: Date | undefined;
  creditsBalance: number;
  creditQuota: number;
  card: { last4: string; cardType: string | null; bank: string | null; expiry: string | null } | null;
  isProcessing: string | null;
  isCanceling: boolean;
  onUpgrade: (planId: string) => void;
  onAddPaymentMethod: () => void;
  onCancelSubscription: () => void;
  currentTier: string;
}

export function SubscriptionOverviewCard({
  currentPlan,
  orgStatus,
  daysUntilExpiry,
  expiresAt,
  creditsBalance,
  creditQuota,
  card,
  isProcessing,
  isCanceling,
  onUpgrade,
  onAddPaymentMethod,
  onCancelSubscription,
  currentTier,
}: SubscriptionOverviewCardProps) {
  const isActive = orgStatus === "active" || orgStatus === "trialing";

  return (
    <section>
      <Card className="bg-card border-border shadow-sm overflow-hidden pt-3">
        <div className="bg-muted/30 border-b border-border px-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {isActive ? "Active Subscription" : "Inactive Subscription"}
          </div>
          <div className="text-sm text-subtle-foreground">
            {isActive
              ? `Next billing period starts in ${daysUntilExpiry} days`
              : `Expired on ${formatDate(expiresAt?.toISOString() ?? null)}`}
          </div>
        </div>

        <CardContent className="px-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="capitalize text-foreground flex items-center gap-2 font-medium">
                  {currentPlan.name} Plan
                </h3>
                <p className="text-sm text-subtle-foreground mt-0.5">{currentPlan.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start">
              {orgStatus === "trialing" && (
                <Badge variant="secondary" className="bg-muted text-foreground hover:bg-muted pointer-events-none">
                  Trial Period
                </Badge>
              )}
              {!isActive && (
                <Button
                  onClick={() => onUpgrade(currentTier)}
                  disabled={isProcessing !== null}
                  size="sm"
                >
                  {isProcessing === currentTier ? (
                    <SystemRestart className="w-4 h-4 animate-spin" />
                  ) : (
                    "Renew Subscription"
                  )}
                </Button>
              )}
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="w-9 h-9 border-border bg-background shadow-sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => e.preventDefault()}
                      >
                        Cancel Subscription
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You&apos;ll keep access until the end of your current billing period. After that, your account will be downgraded and active ads will be paused.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onCancelSubscription}
                      disabled={isCanceling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isCanceling ? <SystemRestart className="w-4 h-4 animate-spin" /> : "Yes, Cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-border">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                <CreditCard className="w-4 h-4" />
                Payment Method
              </div>
              {card ? (
                <div className="flex items-center gap-3 text-foreground">
                  <span className="text-sm font-medium">**** **** **** {card.last4}</span>
                  <CardBrandIcon cardType={card.cardType} />
                </div>
              ) : (
                <button
                  onClick={onAddPaymentMethod}
                  disabled={isProcessing === "card_auth"}
                  className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isProcessing === "card_auth" ? (
                    <SystemRestart className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add payment method
                </button>
              )}
            </div>

            <div className="space-y-2.5 md:border-l md:border-border md:pl-6">
              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                <Coins className="w-4 h-4" />
                Subscription Credits
              </div>
              <div className="text-foreground text-sm font-medium">
                {creditsBalance} credits available{" "}
                <span className="text-subtle-foreground">/ {creditQuota}</span>
              </div>
            </div>

            <div className="space-y-2.5 md:border-l md:border-border md:pl-6">
              <div className="flex items-center gap-2 text-sm text-subtle-foreground">
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">₦</div>
                Plan Cost
              </div>
              <div className="text-foreground flex items-center gap-1.5 text-sm font-medium">
                {formatCurrency(currentPlan.price)}{" "}
                <span className="text-subtle-foreground">/ Monthly</span>
                <Info className="w-4 h-4 text-subtle-foreground ml-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-subtle-foreground mt-3">
        Payment Secured by <span className="text-foreground">paystack</span>
      </p>
    </section>
  );
}
