"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wallet, Plus, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import {
  initializeAdBudgetTopup,
  getAdBudgetWallet,
} from "@/actions/ad-budget";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Top-up presets (in Naira)
// ─────────────────────────────────────────────────────────────────────────────
const TOPUP_PRESETS = [
  { label: "₦5,000", amount: 5000, usdApprox: "$3.20" },
  { label: "₦10,000", amount: 10000, usdApprox: "$6.40" },
  { label: "₦25,000", amount: 25000, usdApprox: "$16.00" },
  { label: "₦50,000", amount: 50000, usdApprox: "$32.00" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function AdBudgetTopup() {
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // ── Derived fee values ─────────────────────────────────────────────────
  const feeAmount = selectedAmount
    ? Math.round(selectedAmount * PLATFORM_FEE_RATE)
    : 0;
  const totalAmount = selectedAmount ? selectedAmount + feeAmount : 0;
  const feePercent = Math.round(PLATFORM_FEE_RATE * 100);

  // ────────────────────────────────────────────────────────────────────────
  // Fetch current ad budget balance
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchBalance() {
      try {
        const wallet = await getAdBudgetWallet();
        setBalance(wallet?.balance_ngn ? wallet.balance_ngn / 100 : 0); // Convert kobo → Naira
      } catch (error) {
        console.error("Failed to fetch ad budget balance:", error);
        toast.error("Failed to load wallet balance");
      } finally {
        setLoadingBalance(false);
      }
    }

    fetchBalance();
  }, []);

  // ────────────────────────────────────────────────────────────────────────
  // Handle top-up button click
  // ────────────────────────────────────────────────────────────────────────
  async function handleTopUp() {
    if (!selectedAmount) {
      toast.error("Please select an amount to top up");
      return;
    }

    setLoading(true);

    try {
      // Initialize Paystack transaction (fee is calculated server-side too)
      const { authorization_url, reference } = await initializeAdBudgetTopup(
        selectedAmount,
        `${window.location.origin}/settings/subscription?topup_success=true`,
      );

      console.log("Paystack transaction initialized:", reference);

      // Redirect to Paystack checkout
      window.location.href = authorization_url;
    } catch (error: any) {
      console.error("Failed to initialize top-up:", error);
      toast.error(error.message || "Failed to start payment");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Ad Budget Wallet
        </CardTitle>
        <CardDescription>
          Pay in Naira. We create a virtual USD card and fund your Meta ads
          automatically.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Current Balance */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="rounded-lg bg-linear-to-br from-primary/10 to-primary/5 p-6 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Available Balance
          </p>
          {loadingBalance ? (
            <div className="h-10 w-32 mx-auto bg-muted/50 rounded animate-pulse" />
          ) : (
            <p className="text-4xl font-bold text-primary">
              ₦{balance?.toLocaleString() || "0"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            ≈ ${((balance || 0) / 1555).toFixed(2)} USD
          </p>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Top-Up Amount Selection */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-medium mb-3">Select Top-Up Amount</p>
          <div className="grid grid-cols-2 gap-3">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset.amount}
                onClick={() => setSelectedAmount(preset.amount)}
                disabled={loading}
                className={`
                  group relative rounded-lg border-2 p-4 text-left transition-all
                  ${
                    selectedAmount === preset.amount
                      ? "border-primary bg-primary/10 shadow-md scale-105"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">{preset.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {preset.usdApprox} USD
                    </p>
                  </div>
                  {selectedAmount === preset.amount && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Fee Breakdown (shown when amount selected) */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {selectedAmount && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Payment Summary
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Selected Amount</span>
              <span className="font-medium">
                ₦{selectedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Processing Fee ({feePercent}%)
              </span>
              <span className="font-medium">₦{feeAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total to Pay</span>
              <span className="text-primary">
                ₦{totalAmount.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₦{selectedAmount.toLocaleString()} will be credited to your
              wallet.
            </p>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* How It Works */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            How it works
          </p>
          <div className="flex items-start gap-2 text-sm">
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              1
            </div>
            <p className="text-muted-foreground">
              You pay in{" "}
              <span className="font-semibold text-foreground">Naira</span> via
              Paystack
            </p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              2
            </div>
            <p className="text-muted-foreground">
              We convert to{" "}
              <span className="font-semibold text-foreground">USD</span> at
              market rate
            </p>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              3
            </div>
            <p className="text-muted-foreground">
              Your{" "}
              <span className="font-semibold text-foreground">Meta ads</span>{" "}
              run automatically
            </p>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Top-Up Button */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <Button
          onClick={handleTopUp}
          disabled={!selectedAmount || loading}
          size="lg"
          className="w-full gap-2 text-base font-semibold"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : selectedAmount ? (
            <>
              <Plus className="h-5 w-5" />
              Pay ₦{totalAmount.toLocaleString()} via Paystack
              <ArrowRight className="h-4 w-4 ml-auto" />
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Select Amount to Top Up
            </>
          )}
        </Button>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* Trust Indicators */}
        {/* ──────────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="text-xs text-muted-foreground">Powered by Paystack</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <p className="text-xs text-muted-foreground">
              Cards by Sudo Africa
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
