"use client";

import { Coins, InfoCircle, Plus, CreditCard, CheckCircle } from "iconoir-react";
import { useCreditBalance } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

interface CreditsDisplayProps {
  className?: string;
  isCollapsed?: boolean;
}

export function CreditsDisplay({ className, isCollapsed = false }: CreditsDisplayProps) {
  const { balance, quota, percentUsed } = useCreditBalance();

  const creditCostActions = [
    { name: "Creative Recommendations", cost: 0 },
    { name: "Creative Redesign", cost: 2 },
    { name: "Video Generation", cost: 10 },
    { name: "Image Generation", cost: 5 },
  ];

  const TriggerButton = (
    <div
      className={cn(
        "rounded-full p-2 flex items-center justify-center transition-colors shadow-sm border border-border cursor-pointer h-9",
        percentUsed >= 100
          ? "bg-red-50 border-red-200 hover:bg-red-100"
          : percentUsed >= 80
            ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
            : "bg-background border-border hover:bg-muted",
        !isCollapsed && "px-4",
        className
      )}
    >
      <Coins
        className={cn(
          "h-5 w-5",
          percentUsed >= 100
            ? "text-red-500"
            : percentUsed >= 80
              ? "text-amber-500"
              : "text-primary"
        )}
      />

      {!isCollapsed && (
        <div className="flex-1 min-w-0 flex gap-2 items-center ml-2">
          <div className="flex items-center gap-1 font-semibold text-2xs">
            <span
              className={cn(
                percentUsed >= 100
                  ? "text-red-700"
                  : percentUsed >= 80
                    ? "text-amber-700"
                    : "text-foreground"
              )}
            >
              {balance.toLocaleString()}
            </span>
            <span
              className={cn(
                percentUsed >= 100
                  ? "text-red-700"
                  : percentUsed >= 80
                    ? "text-amber-700"
                    : "text-subtle-foreground"
              )}
            >
              Credits
            </span>
          </div>
          <InfoCircle className="h-4 w-4 text-subtle-foreground" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <HoverCard openDelay={200} closeDelay={200}>
        <HoverCardTrigger asChild>
          {TriggerButton}
        </HoverCardTrigger>
        <HoverCardContent 
          className="w-80 p-0 shadow-lg border-border" 
          align={isCollapsed ? "center" : "end"} 
          sideOffset={8}
        >
          <div className="p-4">
            <h4 className="text-base font-heading font-semibold text-foreground">Remaining Credits</h4>
            <p className="text-sm text-subtle-foreground mt-1">Monitor and manage your credit usage</p>
          </div>
          
          <div className="px-4 pb-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-4 bg-background">
                <div className="text-sm text-subtle-foreground mb-3">Plan Credits</div>
                <div className="flex items-center justify-between mb-2">
                  <Progress 
                    value={percentUsed} 
                    className="h-2.5 flex-1 mr-4 bg-muted" 
                    indicatorClassName={cn(
                      percentUsed >= 100 ? "bg-red-500" : percentUsed >= 80 ? "bg-amber-500" : "bg-emerald-500"
                    )} 
                  />
                  <span className="text-xs font-medium text-subtle-foreground">
                    {balance}/{quota}
                  </span>
                </div>
                <div className="text-xs text-subtle-foreground mt-2">
                  {balance} credits left in your plan. Renews monthly.
                </div>
              </div>
              <Separator />
              <div className="p-4 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-subtle-foreground">Add-on Credits</div>
                  <Button variant="link" className="h-auto p-0 text-xs text-primary font-medium">Add Credit</Button>
                </div>
                <div className="text-xs text-subtle-foreground">
                  No add-on credits available.
                </div>
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="p-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Credit Cost per Action</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {creditCostActions.map((action, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-subtle-foreground">{action.name}</span>
                  <span className="text-xs font-medium bg-muted border border-border text-foreground px-2 py-1 rounded-md">
                    {action.cost} credits
                  </span>
                </div>
              ))}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      <Dialog>
        <DialogTrigger asChild>
          <button
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer",
              "bg-[#B840F2] hover:bg-[#A320DB] text-white shadow-sm hover:shadow",
            )}
            title="Buy Credits"
          >
            <Plus className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center mt-2">
            <div className="mx-auto mb-4 bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center">
              <Coins className="h-6 w-6 text-emerald-500" />
            </div>
            <DialogTitle className="text-center text-xl font-heading font-bold">Get Some Credits</DialogTitle>
            <DialogDescription className="text-center text-sm text-subtle-foreground mt-2 max-w-xs mx-auto">
              Top up AI credits to keep your creative flow going. Buy once, use anytime — no expiry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 border border-border rounded-lg overflow-hidden">
             <div className="p-4 bg-background border-b border-border">
                <div className="text-sm text-subtle-foreground mb-1">₦19,000 / one time</div>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-foreground" />
                  <span className="font-semibold text-foreground text-lg">100 Credits</span>
                  <span className="text-sm text-subtle-foreground ml-1">₦190 / per credit</span>
                </div>
             </div>
             <div className="p-4 bg-muted/30">
               <div className="flex items-center justify-between mb-4">
                 <div className="text-sm font-medium text-foreground">Payment Details</div>
                 <Button variant="link" className="h-auto p-0 text-xs text-primary font-medium">Add New Credit Card</Button>
               </div>
               
               <div className="bg-background border border-border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-orange-500" />
                    <div>
                      <div className="text-sm font-medium text-foreground">Card ending in 3025</div>
                      <div className="text-xs text-subtle-foreground">Expiry 10/2028</div>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
               </div>
             </div>
          </div>
          
          <div className="mt-6 space-y-3 mb-2">
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-base font-semibold rounded-lg shadow-sm">
              Buy 100 Credits
            </Button>
            <div className="text-center flex justify-center items-center gap-1.5 text-xs text-subtle-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Payment Secured by Paystack
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
