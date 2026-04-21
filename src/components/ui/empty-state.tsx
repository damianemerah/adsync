import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  variant?: "default" | "ai";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-lg",
            variant === "ai"
              ? "bg-ai/10 text-ai"
              : "bg-accent text-primary",
          )}
        >
          {icon}
        </div>
      )}

      <h3 className="font-heading text-lg font-bold text-foreground">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-subtle-foreground">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
