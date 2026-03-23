"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  WarningCircle,
  WarningTriangle,
  RefreshDouble,
  NavArrowDown,
  NavArrowUp,
  ShieldCheck,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import {
  getAccountHealth,
  type AccountHealthResult,
  type HealthCheck,
} from "@/actions/account-health";

interface AccountHealthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountHealthDialog({
  open,
  onOpenChange,
}: AccountHealthDialogProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const {
    data: result,
    isFetching: isPending,
    refetch,
  } = useQuery({
    queryKey: ["account-health"],
    queryFn: async () => {
      const data = await getAccountHealth();
      // Auto-expand problem rows
      setExpandedIds(
        data.checks.filter((c) => c.status !== "healthy").map((c) => c.id),
      );
      return data;
    },
    enabled: open,
    staleTime: 0, // always fresh when dialog opens
  });

  const runScan = () => { refetch(); };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const totalProblems = result?.totalProblems ?? 0;
  const allClear = totalProblems === 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar sm:max-w-[520px] p-0 gap-0 rounded-lg overflow-hidden border-border shadow-2xl">
        {/* Top Section */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8 text-center relative">
          {/* Animated icon */}
          <div
            className={cn(
              "relative h-16 w-16 rounded-full flex items-center justify-center mb-5 transition-all duration-500",
              isPending
                ? "bg-muted"
                : allClear
                  ? "bg-green-50"
                  : totalProblems >= 2
                    ? "bg-red-50"
                    : "bg-orange-50",
            )}
          >
            {/* Pulse ring on problems */}
            {!isPending && !allClear && (
              <span
                className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-20",
                  totalProblems >= 2 ? "bg-red-400" : "bg-orange-400",
                )}
              />
            )}

            {isPending ? (
              <RefreshDouble className="h-7 w-7 text-muted-foreground animate-spin" />
            ) : allClear ? (
              <ShieldCheck className="h-7 w-7 text-green-600" />
            ) : totalProblems >= 2 ? (
              <WarningCircle className="h-7 w-7 text-red-500" />
            ) : (
              <WarningTriangle className="h-7 w-7 text-orange-500" />
            )}
          </div>

          <DialogHeader className="space-y-1 items-center">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Account Check-Up
            </h2>
            <p className="text-sm text-muted-foreground">
              {isPending ? (
                "Scanning your account..."
              ) : allClear ? (
                "Everything looks great! No issues found."
              ) : (
                <>
                  <span className="font-semibold text-foreground">
                    {totalProblems} problem{totalProblems > 1 ? "s" : ""} found
                  </span>{" "}
                  in your ad accounts, please fix{" "}
                  {totalProblems > 1 ? "them" : "it"}
                </>
              )}
            </p>
          </DialogHeader>
        </div>

        {/* Checks List */}
        <div className="max-h-[400px] overflow-y-auto no-scrollbar mx-6 mb-2 rounded-lg border border-border divide-y divide-border bg-card">
          {isPending && !result
            ? // Skeleton
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-2/3" />
                  </div>
                </div>
              ))
            : (result?.checks ?? []).map((check) => (
                <CheckRow
                  key={check.id}
                  check={check}
                  expanded={expandedIds.includes(check.id)}
                  onToggle={() => toggleExpand(check.id)}
                />
              ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 mt-1">
          <Button
            variant="outline"
            onClick={runScan}
            disabled={isPending}
            className="gap-2 rounded-md border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshDouble
              className={cn("h-4 w-4", isPending && "animate-spin")}
            />
            {isPending ? "Scanning..." : "Re-Scan"}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-md bg-foreground text-background hover:bg-foreground/90 font-semibold px-6"
          >
            {allClear ? "Done" : "Skip for Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({
  check,
  expanded,
  onToggle,
}: {
  check: HealthCheck;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetail = !!check.detail || !!check.actionLabel;
  const hasProblem = check.status !== "healthy";

  return (
    <div className="transition-colors">
      {/* Main Row */}
      <button
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasDetail && hasProblem
            ? "cursor-pointer hover:bg-muted/40"
            : "cursor-default",
        )}
        onClick={hasDetail && hasProblem ? onToggle : undefined}
      >
        {/* Status Icon */}
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
            check.status === "healthy" && "bg-green-50",
            check.status === "warning" && "bg-orange-50",
            check.status === "critical" && "bg-red-50",
          )}
        >
          {check.status === "healthy" ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : check.status === "critical" ? (
            <WarningCircle className="h-4 w-4 text-red-500" />
          ) : (
            <WarningTriangle className="h-4 w-4 text-orange-500" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground">{check.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {check.description}
          </p>
        </div>

        {/* Right side */}
        {hasProblem && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full h-auto border-0",
                check.status === "critical"
                  ? "bg-red-100 text-red-600"
                  : "bg-orange-100 text-orange-600",
              )}
            >
              {check.problemCount ?? 1} Problem
              {(check.problemCount ?? 1) > 1 ? "s" : ""}
            </Badge>
            {hasDetail && (
              <span className="text-muted-foreground">
                {expanded ? (
                  <NavArrowUp className="h-4 w-4" />
                ) : (
                  <NavArrowDown className="h-4 w-4" />
                )}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded Detail */}
      {expanded && hasDetail && (
        <div
          className={cn(
            "px-4 pb-4 ml-11 text-sm text-muted-foreground leading-relaxed border-t border-dashed border-border pt-3",
            check.status === "critical" && "bg-red-50/40",
            check.status === "warning" && "bg-orange-50/40",
          )}
        >
          <p>{check.detail}</p>
          {check.actionLabel && check.actionUrl && (
            <Link href={check.actionUrl}>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "mt-3 h-8 text-xs font-semibold rounded-lg",
                  check.status === "critical"
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-orange-200 text-orange-600 hover:bg-orange-50",
                )}
              >
                {check.actionLabel} →
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
