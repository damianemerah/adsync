import { ReactNode } from "react";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";
import { CreditsDisplay } from "@/components/layout/credits-display";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: ReactNode;
  leftContent?: ReactNode;
  children?: ReactNode;
  showHelpCenter?: boolean;
  showCredits?: boolean;
  className?: string;
  containerClassName?: string;
}

export function PageHeader({
  title,
  leftContent,
  children,
  showHelpCenter = true,
  showCredits = false,
  className,
  containerClassName,
}: PageHeaderProps) {
  return (
    <header 
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border bg-background", 
        className
      )}
    >
      <div 
        className={cn(
          "container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8", 
          containerClassName
        )}
      >
        <div className="flex items-center gap-4">
          {title && (
            <h1 className="text-xl font-heading text-foreground tracking-tight">
              {title}
            </h1>
          )}
          {leftContent}
        </div>
        <div className="flex items-center gap-3">
          {children}
          {showCredits && <CreditsDisplay />}
          {showHelpCenter && <HelpCenterSheet />}
        </div>
      </div>
    </header>
  );
}
