"use client";

import Link from "next/link";
import { Cloud } from "iconoir-react";
import { useCreditBalance } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
  className?: string;
  isCollapsed?: boolean;
}

export function CreditsDisplay({
  className,
  isCollapsed = false,
}: CreditsDisplayProps) {
  const { balance, quota, percentUsed } = useCreditBalance();

  // If collapsed, only show the icon and a simple colored outline
  if (isCollapsed) {
    return (
      <Link
        href="/settings/subscription"
        className={cn(
          "rounded-md p-2 flex items-center justify-center border transition-colors shadow-sm border border-border",
          percentUsed >= 100
            ? "bg-red-50 border-red-200"
            : percentUsed >= 80
              ? "bg-amber-50 border-amber-200"
              : "bg-background border-border hover:bg-muted",
          className,
        )}
        title={`${balance.toLocaleString()} of ${quota.toLocaleString()} credits`}
      >
        <Cloud
          className={cn(
            "h-5 w-5",
            percentUsed >= 100
              ? "text-red-500"
              : percentUsed >= 80
                ? "text-amber-500"
                : "text-primary",
          )}
        />
      </Link>
    );
  }

  // Expanded View
  return (
    <Link
      href="/settings/subscription"
      className={cn(
        "rounded-md px-4 py-2 flex items-center gap-3 border transition-colors shadow-sm border border-border min-w-[200px]",
        percentUsed >= 100
          ? "bg-red-50 border-red-200 hover:bg-red-100"
          : percentUsed >= 80
            ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
            : "bg-background border-border hover:bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          percentUsed >= 100
            ? "bg-red-100/50"
            : percentUsed >= 80
              ? "bg-amber-100/50"
              : "bg-primary/10",
        )}
      >
        <Cloud
          className={cn(
            "h-5 w-5",
            percentUsed >= 100
              ? "text-red-500"
              : percentUsed >= 80
                ? "text-amber-500"
                : "text-primary",
          )}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              percentUsed >= 100
                ? "text-red-700"
                : percentUsed >= 80
                  ? "text-amber-700"
                  : "text-subtle-foreground",
            )}
          >
            Credits
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              percentUsed >= 100
                ? "text-red-700"
                : percentUsed >= 80
                  ? "text-amber-700"
                  : "text-foreground",
            )}
          >
            {balance.toLocaleString()}
          </span>
        </div>

        {quota > 0 && (
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                percentUsed >= 100
                  ? "bg-red-500"
                  : percentUsed >= 80
                    ? "bg-amber-400"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
}
