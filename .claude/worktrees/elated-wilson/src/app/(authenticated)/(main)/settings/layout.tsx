"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { name: "General", href: "/settings/general" },
  { name: "Businesses", href: "/settings/business" },
  { name: "Subscription & Payment", href: "/settings/subscription" },
  { name: "Members", href: "/settings/team" },
  { name: "Notifications", href: "/settings/notifications" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>

          {/* Navigation Bar */}
          <nav className="flex gap-6 mt-6 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
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
      </header>

      <main className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
