"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";

const TABS = [
  { name: "General", href: "/settings/general" },
  { name: "Businesses", href: "/settings/business" },
  { name: "Subscription & Payment", href: "/settings/subscription" },
  { name: "Invoices", href: "/settings/invoices" },
  { name: "Members", href: "/settings/team" },
  { name: "Notifications", href: "/settings/notifications" },
];

export function SettingsHeader() {
  const pathname = usePathname();

  return (
    <>
      <PageHeader
        title="Settings"
        showHelpCenter={false}
        showCredits={pathname.startsWith("/settings/subscription")}
      />
      <div className="border-b border-border bg-background sticky top-16 z-20">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
