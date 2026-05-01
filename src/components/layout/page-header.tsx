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
          "container max-w-7xl mx-auto flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4", 
          containerClassName
        )}
      >
        <div className="flex flex-1 items-center gap-4 min-w-0">
          {title && (
            <h1 className="font-heading text-foreground truncate font-medium">
              {title}
            </h1>
          )}
          {leftContent}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {children}
          {showCredits && <CreditsDisplay />}
          {showHelpCenter && <HelpCenterSheet />}
        </div>
      </div>
    </header>
  );
}
