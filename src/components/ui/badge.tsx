import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-muted text-foreground [a&]:hover:bg-muted/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        /* Solid status variants */
        success:
          "border-transparent bg-status-success text-status-success-foreground [a&]:hover:bg-status-success/90",
        warning:
          "border-transparent bg-status-warning text-status-warning-foreground [a&]:hover:bg-status-warning/90",
        danger:
          "border-transparent bg-status-danger text-status-danger-foreground [a&]:hover:bg-status-danger/90",
        info:
          "border-transparent bg-status-info text-status-info-foreground [a&]:hover:bg-status-info/90",
        /* Soft status variants — tint bg + colored text, preferred for inline status chips */
        "success-soft":
          "border-transparent bg-status-success-soft text-status-success",
        "warning-soft":
          "border-transparent bg-status-warning-soft text-status-warning",
        "danger-soft":
          "border-transparent bg-status-danger-soft text-status-danger",
        "info-soft":
          "border-transparent bg-status-info-soft text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
