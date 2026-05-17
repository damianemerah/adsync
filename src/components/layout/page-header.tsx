"use client";

import { ReactNode } from "react";
import { Menu } from "iconoir-react";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";
import { CreditsDisplay } from "@/components/layout/credits-display";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: ReactNode;
  leftContent?: ReactNode;
  children?: ReactNode;
  showHelpCenter?: boolean;
  showCredits?: boolean;
  showNotifications?: boolean;
  className?: string;
  containerClassName?: string;
}

export function PageHeader({
  title,
  leftContent,
  children,
  showHelpCenter = true,
  showCredits = false,
  showNotifications = true,
  className,
  containerClassName,
}: PageHeaderProps) {
  const { toggleMobile } = useSidebar();

  return (
    <header 
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md", 
        className
      )}
    >
      <div 
        className={cn(
          "container max-w-7xl mx-auto flex min-h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4", 
          containerClassName
        )}
      >
        <div className="flex flex-1 items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMobile}
            aria-label="Open navigation"
            className="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {title && (
            <h1 className="font-heading text-foreground truncate font-medium text-sm sm:text-base">
              {title}
            </h1>
          )}
          {leftContent}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {children}
          {showCredits && <CreditsDisplay />}
          {showNotifications && <NotificationBell />}
          {showHelpCenter && <HelpCenterSheet />}
        </div>
      </div>
    </header>
  );
}

