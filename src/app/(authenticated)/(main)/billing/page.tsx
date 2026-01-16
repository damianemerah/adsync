"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initiateSubscription } from "@/actions/billing";
import { verifyPayment } from "@/actions/verify-payment";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Clock,
  Zap,
  AlertTriangle,
  Loader2,
  Download,
  Lock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataTable, Column } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

// Define these here or import from @/lib/constants if you created that file
const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  TRIALING: "trialing",
  EXPIRED: "expired",
};

const PLANS = [
  {
    id: "starter",
    name: "Starter Plan",
    price: "₦10,000",
    features: ["1 Ad Account", "Basic AI Targeting", "1 Team Member"],
  },
  {
    id: "growth",
    name: "Growth Plan",
    price: "₦25,000",
    features: [
      "3 Ad Accounts",
      "Advanced AI Copy",
      "3 Team Members",
      "WhatsApp Alerts",
    ],
    popular: true,
  },
  {
    id: "agency",
    name: "Agency Plan",
    price: "₦60,000",
    features: ["Unlimited Accounts", "Priority Support", "10 Team Members"],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // 1. Fetch Real Data
  const { data, isLoading, refetch } = useSubscription();

  const subscription = data?.org;
  const transactions = data?.transactions || [];

  // Helper: Plan Name Mapping
  const getPlanName = (tier: string) => {
    return (
      PLANS.find((p) => p.id === tier)?.name || tier?.toUpperCase() + " Plan"
    );
  };

  // Helper: Days Remaining
  const daysRemaining = subscription?.expiresAt
    ? Math.ceil(
        (subscription.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  // --- HANDLERS ---

  // 1. Handle Paystack Return (The "Pull" Verification)
  useEffect(() => {
    const reference = searchParams.get("reference");
    const success = searchParams.get("success");

    if ((success === "true" || reference) && !isProcessing) {
      const verify = async () => {
        if (reference) {
          // This calls your server action to manually verify with Paystack API
          toast.promise(verifyPayment(reference), {
            loading: "Verifying payment...",
            success: () => {
              refetch(); // Update UI immediately
              router.replace("/billing");
              return "Payment Verified! Subscription Active.";
            },
            error: "Verification failed. Please contact support.",
          });
        }
      };
      verify();
    }
  }, [searchParams, router, refetch, isProcessing]);

  // 2. Handle Payment Initiation
  const handleSubscribe = async (planId: string, priceString: string) => {
    setIsProcessing(planId);

    try {
      const { url } = await initiateSubscription(planId, priceString);
      if (url) {
        window.location.href = url; // Redirect to Paystack
      }
    } catch (error: any) {
      toast.error("Payment Error", { description: error.message });
      setIsProcessing(null);
    }
  };

  // Columns for History Table
  const columns: Column<any>[] = [
    {
      key: "created_at",
      title: "Date",
      render: (row) => (
        <span className="text-slate-500 font-mono text-xs">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "description",
      title: "Description",
      className: "font-medium text-slate-900",
    },
    {
      key: "amount_cents",
      title: "Amount",
      render: (row) => `₦${(row.amount_cents / 100).toLocaleString()}`,
    },
    {
      key: "status",
      title: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "border-0 capitalize",
            row.status === "success" &&
              "text-green-700 bg-green-50 border-green-200",
            row.status === "pending" &&
              "text-yellow-700 bg-yellow-50 border-yellow-200",
            row.status === "failed" && "text-red-700 bg-red-50 border-red-200"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "Receipt",
      className: "text-right",
      render: () => (
        <Button variant="ghost" size="sm" className="h-8">
          <Download className="h-4 w-4 text-slate-400" />
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col p-8 space-y-8 max-w-6xl mx-auto w-full">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const isSubscriptionActive =
    subscription?.status === SUBSCRIPTION_STATUS.ACTIVE ||
    subscription?.status === SUBSCRIPTION_STATUS.TRIALING;

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Billing
          </h1>
          {!isSubscriptionActive && (
            <Badge
              variant="destructive"
              className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
            >
              Action Required
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-12">
        {/* SECTION 1: SUBSCRIPTION STATUS */}
        {isSubscriptionActive ? (
          <Card className="bg-[#0F172A] text-white border-slate-800 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="grid md:grid-cols-2 p-8 gap-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 capitalize">
                    {subscription?.status}
                  </Badge>
                  <span className="text-slate-400 text-sm">
                    Valid until {subscription?.expiresAt.toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  {getPlanName(subscription?.tier || "")}
                </h2>
                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" /> {daysRemaining}{" "}
                    Days Left
                  </div>
                </div>

                {daysRemaining < 7 && (
                  <div className="mt-6 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-orange-200 font-bold text-sm">
                        Expiring Soon
                      </p>
                      <p className="text-orange-200/70 text-xs">
                        Renew now to avoid interruption.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center items-start md:items-end">
                <div className="w-full max-w-xs space-y-4">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Plan Usage</span>
                    <span>{daysRemaining}/30 Days</span>
                  </div>
                  <Progress
                    value={((30 - daysRemaining) / 30) * 100}
                    className="h-2 bg-slate-800"
                  />
                  <Button
                    size="lg"
                    className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold"
                    onClick={() => {
                      document
                        .getElementById("plans")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-600" />
                    Extend Access
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Lock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900">
                    Subscription Expired
                  </CardTitle>
                  <CardDescription className="text-red-800/80">
                    Your access to AdSync features is currently locked. Select a
                    plan below to reactivate.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* SECTION 2: PLANS GRID */}
        <div id="plans">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            Available Plans <Badge variant="outline">Prepaid Access</Badge>
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const isCurrentPlan = subscription?.tier === plan.id;
              const isTrialing =
                subscription?.status === SUBSCRIPTION_STATUS.TRIALING;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "flex flex-col transition-all hover:shadow-lg",
                    plan.popular
                      ? "border-blue-600 ring-1 ring-blue-600 shadow-md relative"
                      : "border-slate-200",
                    isCurrentPlan && !isTrialing
                      ? "bg-slate-50 border-slate-300"
                      : "bg-white"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wider">
                      Recommended
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {plan.price}
                      </span>
                      <span className="text-slate-500 font-medium">
                        {" "}
                        / 30 days
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feat, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-sm text-slate-600"
                        >
                          <Check className="h-4 w-4 text-green-500 shrink-0" />{" "}
                          {feat}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={cn(
                        "w-full h-12 font-bold",
                        plan.popular
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-slate-900 hover:bg-slate-800",
                        // Make it look disabled if it's the current active paid plan
                        isCurrentPlan && !isTrialing && "opacity-80"
                      )}
                      onClick={() => handleSubscribe(plan.id, plan.price)}
                      disabled={
                        !!isProcessing || (isCurrentPlan && !isTrialing)
                      }
                    >
                      {isProcessing === plan.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Processing...
                        </>
                      ) : isCurrentPlan && isTrialing ? (
                        "Activate Now (End Trial)"
                      ) : isCurrentPlan ? (
                        "Current Plan"
                      ) : (
                        "Switch to this Plan"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: TRANSACTION HISTORY */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Receipts for your access passes.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={transactions}
              emptyState={
                <div className="text-center py-8 text-slate-500">
                  No transactions yet.
                </div>
              }
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
