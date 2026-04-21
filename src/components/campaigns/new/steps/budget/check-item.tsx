"use client";

import { cn } from "@/lib/utils";
import { Check } from "iconoir-react";

export function CheckItem({
  label,
  status,
  inverse = false,
}: {
  label: string;
  status: "success" | "warning" | "error" | "loading";
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
          status === "success"
            ? "bg-primary/20 text-primary"
            : status === "warning"
              ? "bg-status-warning-soft text-status-warning"
              : status === "loading"
                ? "bg-white/10 text-white/60"
                : "bg-status-danger-soft text-status-danger",
        )}
      >
        {status === "success" ? (
          <Check className="h-4 w-4" />
        ) : status === "warning" ? (
          <span className="font-bold text-xs">!</span>
        ) : status === "loading" ? (
          <div className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white/80 animate-spin" />
        ) : (
          <div className="h-2 w-2 bg-status-danger rounded-full" />
        )}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          status === "loading" && "opacity-60",
          inverse ? "text-muted" : "text-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}
