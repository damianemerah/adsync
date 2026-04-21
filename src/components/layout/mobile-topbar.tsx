"use client";

import { Menu } from "iconoir-react";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useSubscription } from "@/hooks/use-subscription";

export function MobileTopbar() {
  const { toggleMobile } = useSidebar();
  const { data } = useSubscription();
  const orgName = data?.org?.name ?? "Tenzu";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4 lg:hidden">
      <button
        onClick={toggleMobile}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <span className="truncate font-heading text-sm font-bold text-foreground">
          {orgName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
